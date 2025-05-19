import './LoadingPage.css'
import { useEffect, useState } from 'react'
import applogo from '../../Resources/assets/images/enterprisecompute.png'

const LoadingPage = ()=>{

    return(
        <>
            <div className='loadingpage'>
                <div>
                    <div 
                        className="loadinglogocover"                        
                    >
                        <img src={applogo} className="loadinglogo"/>
                    </div>
                    <h3>YOUR ENTERPRISE COMPUTE</h3>                    
                </div>
            </div>
        </>
    )
}

export default LoadingPage