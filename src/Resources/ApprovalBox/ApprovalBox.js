import {useState, useEffect, useRef, useContext} from 'react'
import ContextProvider from '../ContextProvider'

const ApprovalBox = ({ 
    onClose, postApprovalUpdate, module, section, 
}) => {
    
    const {approvalStatus, setApprovalStatus, 
        setApprovalMessage, approvalMessage, companyRecord,
    } = useContext(ContextProvider)

    

    const handleChange = (e) => {
        const { name, value } = e.target

        if (name === 'status'){
            setApprovalStatus(value === 'yes')
        }else if (name === 'message'){
            setApprovalMessage(value)
        }        
    }

    const handleSubmit = (e) => {
        e.preventDefault()
                
        postApprovalUpdate()
        onClose()
    }

    // if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Approvals</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Approval ID</label>
                        <input                             
                            value={companyRecord?.emailid}
                            type='text'
                            disabled={true}
                        />                            
                    </div>
                    <div className="form-group">
                        <label>Module</label>
                        <input                             
                            value={module.toUpperCase()}
                            type='text'
                            disabled={true}
                        />                            
                    </div>
                    <div className="form-group">
                        <label>Approval Section</label>
                        <input                             
                            value={section.toUpperCase()}
                            type='text'
                            disabled={true}
                        />                            
                    </div>

                    <div className="form-group">
                        <label>Do You Approve?</label>
                        <select
                            name="status" 
                            value={approvalStatus? 'yes' : 'no'}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Do You Approve?</option>
                            <option value="yes">YES</option>
                            <option value="no">NO</option>
                            
                        </select>
                    </div>

                    {!approvalStatus && <div className="form-group">
                        <label>Rejection Message</label>
                        <textarea
                            type="text"
                            name="message"
                            value={approvalMessage}
                            onChange={handleChange}
                            placeholder="Enter Reason For Rejection"
                            required
                        />
                    </div>}

                    <div className="modal-footer">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit">Update Approval</button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    width: 100%;
                    max-width: 600px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    font-weight: bold;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 35px;
                    cursor: pointer;
                    color: #666;
                }

                .form-group {
                    margin-bottom: 15px;
                }

                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                }

                input, select {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                textarea {
                    width: 100%;
                    height: 200px;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .modal-footer {
                    margin-top: 20px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    border: none;
                    cursor: pointer;
                }

                button[type="submit"] {
                    background-color: #4CAF50;
                    color: white;
                }

                button[type="button"] {
                    background-color: #f1f1f1;
                }
            `}</style>
        </div>
    )
}

export default ApprovalBox