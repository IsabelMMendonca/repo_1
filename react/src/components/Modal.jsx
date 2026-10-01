import { useImperativeHandle, useRef } from "react";
import { createPortal } from "react-dom";
export const Modal = ({ children, ref, buttonCaption }) => {
  const dialog = useRef();
  useImperativeHandle(ref, () => {
    return {
      open() {
        dialog.current.showModal();
      },
    };
  });
  return createPortal(
    <dialog ref={dialog}  className="backdrop:bg-stone-800/90 p-6 rounded-md shadow-md" >
      {children}
      <form method="dialog" className="mt-4 text-right" >
        <button>{buttonCaption}</button>
      </form>
    </dialog>,
    document.getElementById("modal-root"),
  );
};
