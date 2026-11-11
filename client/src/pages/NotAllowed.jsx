import Navbar from '../components/Navbar.jsx';

export default function NotAllowed() {
  return (
    <>
      <Navbar />
      <main>
        <h1>Not allowed</h1>
        <p>You do not have permission to view this page.</p>
      </main>
    </>
  );
}
