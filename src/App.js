import logo from './logo.svg';
import './App.css';
import FormPage from './Components/FormPage/FormPage'
import {Router, Routes, Route } from 'react-router-dom';
function App() {
  return (
    <>
        <Routes>
          <Route path='/' element={<FormPage/>}></Route>
        </Routes>
    </>
  );
}

export default App;
