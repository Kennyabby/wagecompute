import './Profile.css'
import { useEffect, useState, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider';

const Profile = ()=>{
    const { server, fetchServer, storePath, loadPage} = useContext(ContextProvider)
    
    
    useEffect(()=>{
        storePath('profile')
    },[storePath])
    
    
    return (
        <>
            PROFILE
        </>
    )
}

export default Profile