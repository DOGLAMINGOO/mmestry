import { useEffect } from 'react';

function NotFound(){
    useEffect(() => {
        document.title = 'Page Not Found - MMestry';
    }, []);
    return <div>NotFound</div>
}

export default NotFound;