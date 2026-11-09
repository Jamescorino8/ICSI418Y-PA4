import { useEffect, useState } from 'react'
import './App.css'
import Signup from './components/Signup.jsx'
import Login from './components/Login.jsx'
import CreateProject from './components/CreateProject.jsx'
import ProjectList from './components/ProjectList.jsx'
import ProjectMembers from './components/ProjectMembers.jsx'
import ProjectBacklog from './components/ProjectBacklog.jsx'

function App() {
  // users and projects are shared by the project components, so they are fetched here
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  // goes up whenever a member is added or removed, so the backlog reloads its assignee list
  const [memberChanges, setMemberChanges] = useState(0)

  async function loadUsers() {
    try {
      const response = await fetch('http://localhost:9000/api/users')
      if (response.ok) {
        setUsers(await response.json())
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function loadProjects() {
    try {
      const response = await fetch('http://localhost:9000/api/projects')
      if (response.ok) {
        setProjects(await response.json())
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadUsers()
    loadProjects()
  }, [])

  return (
    <>
      <Signup onSignup={loadUsers}/>
      <Login/>
      <CreateProject users={users} onCreate={loadProjects}/>
      <ProjectList projects={projects} users={users}/>
      <ProjectMembers
        projects={projects}
        users={users}
        onMembersChange={() => setMemberChanges((count) => count + 1)}
      />
      <ProjectBacklog projects={projects} users={users} memberChanges={memberChanges}/>
    </>
  )
}

export default App
