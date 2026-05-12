import './Profile.css'
import { useEffect, useState, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider';

const Profile = ()=>{
    const { server, fetchServer, storePath, loadPage} = useContext(ContextProvider)
    
    
    useEffect(()=>{
        storePath('profile')
        document.title = 'Profile | Enterprise Compute Central'
    },[storePath])
    
    
    return (
        <>
            PROFILE
        </>
    )
}

export default Profile