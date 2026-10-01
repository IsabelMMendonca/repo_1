import React from "react";
import { Tasks } from "./Tasks";

export default function SelectedProject({project, onDelete}) {
    const formattedDate = new Date(project.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  return (
    <div className="w-[35rem] mt-16">
      <header className="pb-4 mb-4 border-b border-stone-300">
        <div className="flex items-center justify-between ">
          <h1 className="text-2xl font-bold text-stone-800">{project.title}</h1>
          <button onClick={onDelete} className="text-stone-800 hover:text-stone-950">
            delete
          </button>
        </div>
        <p className="mb-4 text-stone-400">{formattedDate}</p>
        <p className="whitespace-pre-line text-stone-600">{project.desc}</p>
      </header>
      <Tasks />
    </div>
  );
}
