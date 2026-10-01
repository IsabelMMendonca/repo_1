import React from 'react'

function NewTask() {
  return (
    <div className="flex items-center gap-4">
        <input type="text" className="w-64 px-2 py-1 rounded-sm bg-stone-200" />
        <button className='bg-stone-700 text-stone-50 px-4 py-2 rounded-md hover:bg-stone-900'>Add Task</button> 
    </div>
  )
}

export default NewTask