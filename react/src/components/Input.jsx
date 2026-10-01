import React from "react";

export const Input = ({ label, textarea, onInput, ...props }) => {
  const inputClass =
    "w-full p-1 border-b-2 rounded-sm border-stone-300 bg-stone-200 text-stone-600 focus:outline-none focus:border-stone-600";

  const handleInput = (event) => {
    const field = event.currentTarget;

    if (textarea || field.type === "text") {
      const { value, selectionStart, selectionEnd } = field;
      const filteredValue = value.replace(/\d/g, "");

      if (value !== filteredValue) {
        field.value = filteredValue;
        field.setSelectionRange(
          value.slice(0, selectionStart).replace(/\d/g, "").length,
          value.slice(0, selectionEnd).replace(/\d/g, "").length,
        );
      }
    }

    onInput?.(event);
  };

  return (
    <p className="flex flex-col gap-1 my-4">
      <label className="text-sm font-bold uppercase text-stone-500">
        {label}
      </label>
      {textarea ? (
        <textarea className={inputClass} {...props} onInput={handleInput} />
      ) : (
        <input className={inputClass} {...props} onInput={handleInput} />
      )}
    </p>
  );
};
