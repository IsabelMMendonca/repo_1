import React, { useRef } from "react";
import { Input } from "./Input";
export const NewProject = () => {
  const buttonClass = "text-stone-800 hover:text-stone-950";
  const project = useRef({
    title: undefined,
    desc: undefined,
    date: undefined
  })
  return (
    <div className="w-[35rem] mt-16">
      <menu className="flex items-center justify-end gap-4 my-4">
        <li>
          <button className={buttonClass}>Cancel</button>
        </li>
        <li>
          <button className=" px-6 py-2 rounded-md bg-stone-800 text-stone-50 hover:bg-stone-950">
            Save
          </button>
        </li>
      </menu>
      <div>
        <Input ref={project.title} label="title"></Input>
        <Input ref={project.desc} label="description" textarea></Input>
        <Input ref={project.date} label="due date"></Input>
      </div>
    </div>
  );
};
