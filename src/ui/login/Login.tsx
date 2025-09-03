import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from '@/components/ui/card';
import './Login.css'
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useContext, useEffect, useState } from 'react';
import WebSocketContext from '@/utils/WebSocketContext';
import { addToast } from '@heroui/toast';
import { useNavigate } from 'react-router-dom';

function Login() {
    const socket = useContext(WebSocketContext);
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    if (socket && socket.current) {
        const ws = socket.current;

        ws.onmessage = (event) => {
            console.log('Mensagem recebida do servidor');
            try {
                const data = JSON.parse(event.data);
                console.log('Mensagem recebida do servidor (parsed):', data);
                if (data.type === 'auth' && data.subtype === 'login_success') {
                    alert('Login bem-sucedido!');
                    localStorage.setItem('currentPlayer', JSON.stringify(data.payload));
                    console.log('Login bem-sucedido:', data.payload);
                    navigate('/games');
                }
            } catch (e) {
                console.error('Erro ao processar mensagem:', e);
            }
        };
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!username) return;
        if (socket && socket.current) {
            socket.current.send(JSON.stringify({ type: 'auth', subtype: 'login', payload: { username: username } }));
        }
    }


    return (
        <div className='login-background'>
            <div className='login-overlay flex w-full h-full items-center justify-center'>
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-6 mb-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="Informe seu nome de usuário"
                                        required
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


export default Login;