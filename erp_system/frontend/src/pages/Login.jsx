import { useEffect } from 'react';
import Form from "../components/Form"

function Login(){
    useEffect(() => {
        document.title = 'Login - MMestry';
    }, []);

    return <div>
        <h1>Login</h1>
        <Form route="api/login/" method='login' />
        <a href="/register">Dont have an account? Register here!</a>
    </div>
}

export default Login