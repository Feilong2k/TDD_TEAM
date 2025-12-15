const { features, tasks, subtasks, query } = require('./db.js');
const fs = require('fs');
const path = require('path');

async function seedFeature2() {
  try {
    console.log('Seeding Feature 2 data...');
    
    // Read the feature2_tasks.json file
    const feature2DataPath = path.join(__dirname, '..', 'data', 'feature2_tasks.json');
    const feature2Data = JSON.parse(fs.readFileSync(feature2DataPath, 'utf8'));
    
    // Read the decomposition JSON for task 2-4
    const decompositionPath = path.join(__dirname, '..', 'data', 'feature2_4_ui_database_integration.json');
    let decomposition = null;
    try {
      decomposition = JSON.parse(fs.readFileSync(decompositionPath, 'utf8'));
    } catch (error) {
      console.warn('Could not read decomposition file:', error.message);
    }
    
    const feature = feature2Data.feature;
    
    // 1. Update Feature 2 status to in_progress (if not already)
    await features.update(feature.id, { status: 'in_progress' });
    console.log(`Updated feature ${feature.id} to in_progress`);
    
    // Process each task in the feature
    for (const task of feature.tasks) {
      console.log(`Processing task ${task.id}: ${task.title}`);
      
      // Check if task already exists
      try {
        const existingTask = await tasks.getById(task.id);
        if (existingTask) {
          // Update existing task
          await tasks.update(task.id, {
            title: task.title,
            description: task.description,
            status: task.status,
            agent: task.agent
          });
          console.log(`  Updated existing task ${task.id}`);
        } else {
          // Insert new task
          await tasks.create({
            id: task.id,
            feature_id: task.feature_id,
            title: task.title,
            description: task.description,
            status: task.status,
            agent: task.agent
          });
          console.log(`  Created new task ${task.id}`);
        }
      } catch (error) {
        // Task doesn't exist, create it
        await tasks.create({
          id: task.id,
          feature_id: task.feature_id,
          title: task.title,
          description: task.description,
          status: task.status,
          agent: task.agent
        });
        console.log(`  Created new task ${task.id} (catch block)`);
      }
      
      // Process subtasks for this task
      if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
          console.log(`  Processing subtask ${subtask.id}: ${subtask.title}`);
          
          // Prepare details for this subtask if it's part of task 2-4 and we have decomposition
          let details = {};
          let metadata = {};
          
          if (task.id === '2-4' && decomposition) {
            const decompositionSubtask = decomposition.decomposition.subtasks.find(
              ds => ds.id === subtask.id
            );
            
            if (decompositionSubtask) {
              details = {
                required_actions: decompositionSubtask.required_actions || [],
                relevant_files: decompositionSubtask.relevant_files || [],
                acceptance_criteria: decompositionSubtask.acceptance_criteria || []
              };
              
              metadata = {
                decomposition: {
                  response_type: decomposition.response_type,
                  workflow_step: decomposition.workflow_step,
                  estimated_time: decompositionSubtask.estimated_time,
                  risk_level: decompositionSubtask.risk_level,
                  dependencies: decompositionSubtask.dependencies || []
                }
              };
            }
          }
          
          try {
            const existingSubtask = await subtasks.getById(subtask.id);
            if (existingSubtask) {
              // Update existing subtask
              await subtasks.update(subtask.id, {
                title: subtask.title,
                description: subtask.description,
                status: subtask.status,
                agent: subtask.agent,
                dependencies: subtask.dependencies || [],
                priority: subtask.priority,
                estimated_time: subtask.estimated_time,
                risk_level: subtask.risk_level,
                details: details,
                metadata: metadata
              });
              console.log(`    Updated existing subtask ${subtask.id} to status: ${subtask.status}`);
            } else {
              // Insert new subtask with details
              await subtasks.create({
                id: subtask.id,
                task_id: subtask.task_id,
                feature_id: subtask.feature_id,
                title: subtask.title,
                description: subtask.description,
                status: subtask.status,
                agent: subtask.agent,
                dependencies: subtask.dependencies || [],
                priority: subtask.priority,
                estimated_time: subtask.estimated_time,
                risk_level: subtask.risk_level,
                details: details,
                metadata: metadata
              });
              console.log(`    Created new subtask ${subtask.id} with status: ${subtask.status}`);
            }
          } catch (error) {
            // Subtask doesn't exist, create it with details
            await subtasks.create({
              id: subtask.id,
              task_id: subtask.task_id,
              feature_id: subtask.feature_id,
              title: subtask.title,
              description: subtask.description,
              status: subtask.status,
              agent: subtask.agent,
              dependencies: subtask.dependencies || [],
              priority: subtask.priority,
              estimated_time: subtask.estimated_time,
              risk_level: subtask.risk_level,
              details: details,
              metadata: metadata
            });
            console.log(`    Created new subtask ${subtask.id} (catch block) with status: ${subtask.status}`);
          }
        }
      }
    }
    
    console.log('Feature 2 seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding Feature 2 data:', error);
    process.exit(1);
  }
}

// Run the seed function
seedFeature2().then(() => {
  console.log('Seed script finished.');
  process.exit(0);
}).catch(error => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
