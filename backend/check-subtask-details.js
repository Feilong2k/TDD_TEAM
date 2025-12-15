const { subtasks } = require('./db.js');

async function checkDetails() {
  try {
    console.log('Checking details for subtask 2-1-1...');
    const subtask = await subtasks.getById('2-1-1');
    if (subtask) {
      console.log('Found subtask:', subtask.id);
      console.log('Details:', JSON.stringify(subtask.details, null, 2));
      console.log('Metadata:', JSON.stringify(subtask.metadata, null, 2));
    } else {
      console.log('Subtask not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDetails();
