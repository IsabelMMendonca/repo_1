import React, { useRef } from "react";
import { Input } from "./Input";
import { Modal } from "./Modal";
export const NewProject = ({ onAdd, onCancel }) => {
  const buttonClass = "text-stone-800 hover:text-stone-950";
  const modal = useRef();
  const title = useRef();
  const desc = useRef();
  const date = useRef();

  const handleSave = () => {
    const project = {
      title: title.current.value,
      desc: desc.current.value,
      date: date.current.value,
    };
    if (
      project.title.trim() === "" ||
      project.desc.trim() === "" ||
      project.date.trim() === ""
    ) {
      modal.current.open();
      return;
    }
    //assume valid data - need to lift state up
    onAdd(project);
  };
  return (
    <>
      <Modal ref={modal} buttonCaption="Okay">
        <h2 className="text-lg font-bold my-4 text-sotone-700">
          Invalid input
        </h2>
        <p className="text-stone-600 mb-4">Please fill in all fields.</p>
      </Modal>
      <div className="w-[35rem] mt-16">
        <menu className="flex items-center justify-end gap-4 my-4">
          <li>
            <button onClick={onCancel} className={buttonClass}>
              Cancel
            </button>
          </li>
          <li>
            <button
              onClick={handleSave}
              className=" px-6 py-2 rounded-md bg-stone-800 text-stone-50 hover:bg-stone-950"
            >
              Save
            </button>
          </li>
        </menu>
        <div>
          <Input ref={title} label="title"></Input>
          <Input ref={desc} label="description" textarea></Input>
          <Input type="date" ref={date} label="due date"></Input>
        </div>
      </div>
    </>
  );
};
