import { NewProject } from "./components/NewProject";
import { ProjectsSidebar } from "./components/ProjectsSidebar";
import NoProjectSelected from "./components/NoProjectSelected";
import { useState } from "react";
function App() {
  const [projectState, setProjectState] = useState({
    selectedProjectId: undefined,
    projects: [],
  });

  const handleStartAddProject = () => {
    setProjectState((prevState) => {
      return {
        ...prevState,
        selectedProjectId: null,
      };
    });
  };
  let content;
  if (projectState.selectedProjectId === null) {
    content = <NewProject />;
  } else if (projectState.selectedProjectId === undefined) {
    content = (
      <NoProjectSelected
        onStartAddProject={handleStartAddProject}
      ></NoProjectSelected>
    );
  }
  return (
    <main className="h-sreen my-8 flex gap-8">
      <ProjectsSidebar onStartAddProject={handleStartAddProject} />
      {/* <NewProject/> */}
      {content}
    </main>
  );
}

export default App;
