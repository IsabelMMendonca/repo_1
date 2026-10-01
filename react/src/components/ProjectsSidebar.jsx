import React from "react";

export const ProjectsSidebar = ({onStartAddProject, projects, onSelectProject, selectedId}) => {
  return (
    <aside className="w-1/3 px-8 py-16 bg-stone-900 text-stone-50 md:w-27 rounded-r-xl">
      <h2 className="mb-8 font-bold uppercase md:text-xl text-stone-200">
        {" "}
        Your projects
      </h2>
      <div>
        <button onClick={onStartAddProject} className="px-4 py-2 text-xs rounded-md bg-stone-700 text-stone-400 hover:bg-stone-600 hover:text-stone-100">
          + Add project
        </button>
      </div>
      <ul className="mt-4">
        {projects.map(pro=> {
          let css = "w-full text-left pa-2 rounded-sm my-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800"

          if(selectedId === pro.id) {
            css += " bg-stone-800 text-stone-200"
          }else{
            css+=" text-stone-400"
          }
          return (
            <li key={pro.id}>
              <button onClick={()=>onSelectProject(pro.id)} className={css}>
                {pro.title}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
