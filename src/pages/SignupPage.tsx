// src/pages/SignupPage.tsx

import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";

// ⭐ --- هذا هو الإصلاح --- ⭐
// تعريف الأدوار في مصفوفة لتجنب تكرار الكود وجعله أكثر مرونة
const roles = ['High Manager', 'Engineer', 'Technician'];

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Engineer'); // قيمة افتراضية
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!role) {
      setError('Please select a role.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // حفظ بيانات المستخدم الإضافية في Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: name, // استخدام displayName ليكون متوافقًا مع باقي المكونات
        email: email,
        role: role,
        status: 'Active',
      });
      
      navigate('/'); // توجيه المستخدم إلى الصفحة الرئيسية بعد التسجيل الناجح
    } catch (err: any) {
      console.error("Firebase signup error:", err.code);
      
      if (err.code === 'auth/weak-password') {
        setError('Password is too weak. It must be at least 6 characters long.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address is not valid.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in.');
      } else {
        setError('Failed to create an account. Please try again.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Enter your details to create a new account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password (at least 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
            
            {/* ⭐ --- هذا هو الإصلاح --- ⭐ */}
            {/* استخدام .map لعرض الأدوار من المصفوفة بشكل ديناميكي */}
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {roles.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col items-stretch">
            <Button type="submit" className="w-full">Sign Up</Button>
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:underline">
                Log In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}