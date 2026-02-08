import Form from "../components/Form"

function Register(){
    return <div>
        <h1>Register</h1>
        <Form route="api/user/register/" method='register' />
        <a href="/login">Have an account? Login here!</a>
    </div>
}

export default Register