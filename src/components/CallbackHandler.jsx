import React, { useEffect } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';
 
const CallbackHandler = () => {

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();
 
  useEffect(() => {

    const handleLogin = async () => {

      const authCode = searchParams.get('code');

      if (authCode) {

        try {

          // IMPORTANT: Replace this with your actual Python Server URL

          const backendUrl = "https://[YOUR_BACKEND_DOMAIN]/auth/login"; 

          const response = await fetch(backendUrl, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ code: authCode }),

          });
 
          const data = await response.json();
 
          if (response.ok) {

            localStorage.setItem('token', data.access_token);

            navigate('/'); // Success! Go to Dashboard

          } else {

            console.error('Login Failed:', data);

            navigate('/auth'); 

          }

        } catch (error) {

          navigate('/auth');

        }

      } else {

        navigate('/auth');

      }

    };
 
    handleLogin();

  }, [searchParams, navigate]);
 
  return <div>Logging in...</div>;

};
 
export default CallbackHandler;
 