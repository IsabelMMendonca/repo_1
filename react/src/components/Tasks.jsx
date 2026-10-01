import React from 'react'
import NewTask from './NewTask'

export const Tasks = () => {
  return (
    <section className="w-[35rem] mt-16">
        <h2 className="text-xl font-bold text-stone-600">Tasks</h2>
        <NewTask/>
        <p className="text-stone-800 my-4">No tasks available.</p>
        <ul className="list-disc list-inside text-stone-600">  </ul>
    </section>


  )
}
