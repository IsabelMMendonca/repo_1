import { NewProject } from "./components/NewProject";
import { ProjectsSidebar } from "./components/ProjectsSidebar";
import NoProjectSelected from "./components/NoProjectSelected";
import { useState } from "react";
function App() {
  const [projectState, setProjectState] = useState({
    selectedProject: undefined,
    projects: []
  });
  return (
    <main className='h-sreen my-8 flex gap-8'>
      <ProjectsSidebar/>
      {/* <NewProject/> */}
      <NoProjectSelected></NoProjectSelected>
    </main>
  );
}

export default App;
