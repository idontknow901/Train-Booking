import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

interface AdminLoginProps {
    onLogin: (password: string) => void;
}



export default function AdminLogin({ onLogin }: AdminLoginProps) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const ADMIN_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH || '';
            if (!ADMIN_HASH) {
                toast.error('Admin not configured. Set VITE_ADMIN_PASSWORD_HASH in environment.');
                return;
            }
            const isMatch = await bcrypt.compare(password, ADMIN_HASH);
            if (isMatch) {
                onLogin(password);
                toast.success('Access granted');
            } else {
                toast.error('Invalid password');
            }
        } catch (error) {
            toast.error('Login error: ' + (error instanceof Error ? error.message : 'Unknown'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                        <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Admin Access</h2>
                    <p className="text-muted-foreground mt-2">Please enter your password to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground ml-1">Password</label>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="pl-10 h-12 rounded-xl"
                                required
                            />
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <Button
                        type="submit"
                        className="w-full h-12 rounded-xl text-md font-bold"
                        disabled={loading}
                    >
                        {loading ? 'Verifying...' : 'Unlock System'}
                    </Button>
                </form>
            </motion.div>
        </div>
    );
}
