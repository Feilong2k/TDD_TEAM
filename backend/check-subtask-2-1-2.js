const { subtasks } = require('./db.js');

async function checkDetails() {
  try {
    console.log('Checking details for subtask 2-1-2...');
    const subtask = await subtasks.getById('2-1-2');
    if (subtask) {
      console.log('Found subtask:', subtask.id);
      console.log('Title:', subtask.title);
      console.log('Description:', subtask.description);
      console.log('Details:', JSON.stringify(subtask.details, null, 2));
      console.log('Has instructions?', !!subtask.details?.instructions);
      console.log('Instructions:', JSON.stringify(subtask.details?.instructions, null, 2));
      console.log('Has notes?', !!subtask.details?.notes);
      console.log('Has key_considerations?', subtask.details?.key_considerations?.length > 0);
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
