import { Link } from 'react-router-dom';

function Home(){
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <p>Home page</p>
                <a href="/logout"><button>Logout</button></a>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
                <Link to="/inventory"><button>Inventory</button></Link>
                <Link to="/customer-orders"><button>Customer Orders</button></Link>
            </div>
        </div>
    );
}

export default Home;
