import React from "react";
import noProject from "../assets/no-projects.png";

export default function NoProjectSelected({onStartAddProject}) {
  return (
    <div className="mt-24 text-center w-2/3">
      <img
        className="object-contain h-16 w-16 mx-auto"
        src={noProject}
        alt="An empty task list"
      />
      <h2 className="text-xl font-bold text-stone-500 my-4">
        {" "}
        no project selected
      </h2>
      <p className="text-stone-400 mb-4">select a project or get started with a new one</p>

      <p>
        <button onClick={onStartAddProject} className="px-4 py-2 text-xs rounded-md bg-stone-700 text-stone-400 hover:bg-stone-600 hover:text-stone-100">
           new project</button>
      </p>
    </div>
  );
}
