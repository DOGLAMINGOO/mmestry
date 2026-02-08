import Form from "../components/Form"

function Login(){
    return <div>
        <h1>Login</h1>
        <Form route="api/login/" method='login' />
        <a href="/register">Dont have an account? Register here!</a>
    </div>
}

export default Login