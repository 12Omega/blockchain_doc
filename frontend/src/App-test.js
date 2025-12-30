import React from 'react';

function App() {
  console.log('App component is rendering!');
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333' }}>🎉 React App is Working!</h1>
      
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2>✅ Frontend Status</h2>
        <p>✅ React app is loading</p>
        <p>✅ Components are rendering</p>
        <p>✅ Styles are working</p>
        <p>🔄 Ready to connect to backend</p>
      </div>

      <div style={{ 
        background: '#e8f5e8', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #4caf50'
      }}>
        <h3>🚀 Next Steps:</h3>
        <ol>
          <li>Frontend is working ✅</li>
          <li>Test backend connection</li>
          <li>Add API integration</li>
          <li>Add wallet connection</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button 
          onClick={() => {
            console.log('Button clicked!');
            alert('React app is working! 🎉');
          }}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🧪 Test React App
        </button>
      </div>
    </div>
  );
}

export default App;