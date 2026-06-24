import { useEffect } from 'react';
import Form from "../components/Form"

function Register(){
    useEffect(() => {
        document.title = 'Register - MMestry';
    }, []);

    return <div>
        <h1>Register</h1>
        <Form route="api/user/register/" method='register' />
        <a href="/login">Have an account? Login here!</a>
    </div>
}

export default Register