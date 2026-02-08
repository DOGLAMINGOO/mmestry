import { Link } from 'react-router-dom';

function Home(){
    return <div>
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <p>Home page</p>
    <a href="/logout"><button>Logout</button></a>
  </div>
  <Link to="/inventory"><button>Inventory</button></Link>
</div>

}

export default Home;

