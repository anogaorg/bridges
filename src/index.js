import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

//Testing APIs
axios.get(
  `/v1/api/users`
)
.then((data) => {
  console.log(data.data);
  console.log(data);
}).catch((e) => {console.log("woops"); console.log(e);})

axios.get(
  `/users`
)
.then((data) => {
  console.log(data.data);
  console.log(data);
}).catch((e) => {console.log("woops"); console.log(e);})

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
