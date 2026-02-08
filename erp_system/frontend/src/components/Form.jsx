import { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'  
import '../styles/Form.css'


function Form({route, method}){
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()


    
    
    const name = method === 'login' ? 'Login' : 'Register';

    const handleSubmit = async (e) => {
        setLoading(true)
        e.preventDefault()

        try{
            const res = await api.post(route, {username, password})
            if(method === 'login'){
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh)  //after a login set the access and refresh tokens and go to the  '/' path
                navigate('/')
            }
        }
        catch(error){
            alert(error)
        }
        finally{
            setLoading(false)
        }
    };




    return(
        <form onSubmit={handleSubmit} className='form-container'>
            <h1>{name}</h1>

            <input
                className='form-input'
                type='text'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder='Enter your username'
            />

            <input
                className='form-input'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Enter your password'
            />

            <button className='form-button' type='submit'>Submit</button>
        </form>
    )
}


export default Form