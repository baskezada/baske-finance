import { Routes, Route } from 'react-router'
import Landing from './screens/Landing'
import Login from './screens/Login'
import Main from './screens/Main'
import TaskDetail from './screens/TaskDetail'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/main" element={<Main />} />
      <Route path="/task/:id" element={<TaskDetail />} />
    </Routes>
  )
}

export default App
