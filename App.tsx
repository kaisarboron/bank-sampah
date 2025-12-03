import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { StorageService } from './services/storage';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Login State
  const [isLoginView, setIsLoginView] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState(''); 
  const [selectedRoleForLogin, setSelectedRoleForLogin] = useState<UserRole>(UserRole.NASABAH); 
  
  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState(''); 

  // Forgot Password State
  const [showForgotPasswordMessage, setShowForgotPasswordMessage] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    StorageService.init();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = StorageService.login(usernameInput, passwordInput);
    if (user) {
      if (user.role === selectedRoleForLogin) {
        const latestUsers = StorageService.getUsers();
        const latestUser = latestUsers.find(u => u.id === user.id);
        if (latestUser) {
          setCurrentUser(latestUser);
          setErrorMsg('');
          setSuccessMsg('');
          setUsernameInput('');
          setPasswordInput(''); 
        } else {
          setErrorMsg('User data not found after login.');
          setSuccessMsg('');
        }
      } else {
        setErrorMsg(`Login gagal. Akun ini bukan ${selectedRoleForLogin === UserRole.ADMIN ? 'Admin' : 'Nasabah'}.`);
        setSuccessMsg('');
      }
    } else {
      setErrorMsg('Username atau password salah.');
      setSuccessMsg('');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regFullName || !regUsername || !regPassword) { 
      setErrorMsg('Mohon lengkapi semua data.');
      return;
    }

    const result = StorageService.registerUser(regFullName, regUsername, regPassword);
    
    if (result.success) {
      setSuccessMsg('Registrasi berhasil! Silakan login dengan username dan password Anda.');
      setErrorMsg('');
      setRegFullName('');
      setRegUsername('');
      setRegPassword(''); 
      setIsLoginView(true); 
    } else {
      setErrorMsg(result.message);
      setSuccessMsg('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setErrorMsg('');
    setSuccessMsg('');
    setUsernameInput('');
    setPasswordInput(''); 
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setErrorMsg('');
    setSuccessMsg('');
    setShowForgotPasswordMessage(false); 
    setUsernameInput('');
    setPasswordInput('');
    setRegFullName('');
    setRegUsername('');
    setRegPassword('');
  };

  const handleShowForgotPassword = () => {
    setShowForgotPasswordMessage(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleBackToLogin = () => {
    setShowForgotPasswordMessage(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const appLogo = (
    <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-md">
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004 12v1m7 3h.582m15.356 2A8.001 8.001 0 004 20v-1m7-1h.582M12 4v1m0 14v1m0-9h.01M12 8v1m0 11v1m0-9h.01M4.5 7.5l.707-.707M16.5 16.5l.707-.707M4.5 16.5l.707.707M16.5 7.5l.707.707"></path>
      </svg>
    </div>
  );

  const navLogo = (
    <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-bold mr-2 shadow-sm">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004 12v1m7 3h.582m15.356 2A8.001 8.001 0 004 20v-1m7-1h.582M12 4v1m0 14v1m0-9h.01M12 8v1m0 11v1m0-9h.01M4.5 7.5l.707-.707M16.5 16.5l.707-.707M4.5 16.5l.707.707M16.5 7.5l.707.707"></path>
      </svg>
    </div>
  );

  // AUTH VIEW (Login / Register)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Subtle Shapes */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-100 to-transparent pointer-events-none"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="flex justify-center">
            {appLogo}
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-text tracking-tight">
            NABUNG <span className="text-primary">BERSIH</span>
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            {isLoginView ? 'Akses Portal Bank Sampah Digital' : 'Bergabung dengan Revolusi Hijau'}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-surface py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-border">
            
            {successMsg && (
              <div className="mb-4 text-green-700 text-sm bg-green-50 p-3 rounded border border-green-200">
                {successMsg}
              </div>
            )}

            {showForgotPasswordMessage ? (
              // FORGOT PASSWORD MESSAGE
              <div className="space-y-6 text-center">
                <h3 className="text-xl font-bold text-text">Lupa Password?</h3>
                <p className="text-muted text-sm leading-relaxed">
                  Untuk aplikasi riil, fitur ini akan mengirimkan instruksi reset password ke email Anda.
                  Namun, karena aplikasi ini adalah <span className="font-bold text-primary">demo client-side</span>,
                  fitur pengiriman email tidak tersedia.
                </p>
                <p className="text-text font-semibold text-sm">
                  Mohon hubungi administrator Anda untuk bantuan reset password.
                </p>
                <button
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center py-2 px-4 border border-border rounded-lg shadow-sm text-sm font-medium text-text bg-gray-50 hover:bg-gray-100 transition-all"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : isLoginView ? (
              // LOGIN FORM
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="login-role" className="block text-xs uppercase tracking-wider font-semibold text-muted mb-2">
                    Masuk Sebagai
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`cursor-pointer text-center py-2 rounded-lg border transition-all ${selectedRoleForLogin === UserRole.ADMIN ? 'bg-blue-50 border-primary text-primary' : 'bg-gray-50 border-border text-muted hover:bg-gray-100'}`}>
                      <input
                        type="radio"
                        className="sr-only"
                        name="login-role"
                        value={UserRole.ADMIN}
                        checked={selectedRoleForLogin === UserRole.ADMIN}
                        onChange={() => setSelectedRoleForLogin(UserRole.ADMIN)}
                      />
                      <span className="text-sm font-medium">Admin</span>
                    </label>
                    <label className={`cursor-pointer text-center py-2 rounded-lg border transition-all ${selectedRoleForLogin === UserRole.NASABAH ? 'bg-blue-50 border-primary text-primary' : 'bg-gray-50 border-border text-muted hover:bg-gray-100'}`}>
                      <input
                        type="radio"
                        className="sr-only"
                        name="login-role"
                        value={UserRole.NASABAH}
                        checked={selectedRoleForLogin === UserRole.NASABAH}
                        onChange={() => setSelectedRoleForLogin(UserRole.NASABAH)}
                      />
                      <span className="text-sm font-medium">Nasabah</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-text">
                    Username
                  </label>
                  <div className="mt-1">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                      placeholder={selectedRoleForLogin === UserRole.ADMIN ? "admin" : "nasabah"}
                    />
                  </div>
                </div>

                <div> 
                  <label htmlFor="password" className="block text-sm font-medium text-text">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="text-red-700 text-sm bg-red-50 p-3 rounded border border-red-200">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:-translate-y-0.5"
                  >
                    MASUK SYSTEM
                  </button>
                </div>

                <div className="text-sm text-right">
                  <button type="button" onClick={handleShowForgotPassword} className="font-medium text-primary hover:text-accent transition-colors">
                    Lupa Password?
                  </button>
                </div>
              </form>
            ) : (
              // REGISTER FORM
              <form className="space-y-6" onSubmit={handleRegister}>
                <div>
                  <label htmlFor="regFullName" className="block text-sm font-medium text-text">
                    Nama Lengkap
                  </label>
                  <div className="mt-1">
                    <input
                      id="regFullName"
                      name="regFullName"
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                      placeholder="Nama Lengkap Anda"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="regUsername" className="block text-sm font-medium text-text">
                    Username
                  </label>
                  <div className="mt-1">
                    <input
                      id="regUsername"
                      name="regUsername"
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                      placeholder="Buat username unik"
                    />
                  </div>
                </div>

                <div> 
                  <label htmlFor="regPassword" className="block text-sm font-medium text-text">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="regPassword"
                      name="regPassword"
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all"
                      placeholder="Minimal 6 karakter"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="text-red-700 text-sm bg-red-50 p-3 rounded border border-red-200">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:-translate-y-0.5"
                  >
                    DAFTAR AKUN
                  </button>
                </div>
              </form>
            )}

            {!showForgotPasswordMessage && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-muted">
                      {isLoginView ? 'Belum punya akun?' : 'Sudah punya akun?'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={toggleView}
                    className="w-full flex justify-center py-2 px-4 border border-border rounded-lg shadow-sm text-sm font-medium text-text bg-gray-50 hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    {isLoginView ? 'Daftar Sekarang' : 'Login Disini'}
                  </button>
                </div>
              </div>
            )}

             {/* Demo Hints */}
             {isLoginView && !showForgotPasswordMessage && (
               <div className="mt-6 bg-blue-50/50 p-4 rounded border border-blue-100">
                 <p className="text-xs text-muted text-center mb-2 uppercase tracking-wide">Akun Demo Cepat:</p>
                 <div className="grid grid-cols-2 gap-3">
                   <div 
                     onClick={() => { setUsernameInput('admin'); setPasswordInput('0987'); setSelectedRoleForLogin(UserRole.ADMIN); }} 
                     className="cursor-pointer w-full inline-flex flex-col justify-center py-1 px-2 border border-gray-200 rounded bg-white text-xs font-medium text-muted hover:border-primary hover:text-primary transition-colors group shadow-sm"
                   >
                     <span className="group-hover:text-primary font-bold">Admin</span>
                     <span className="text-gray-400">P: 0987</span>
                   </div>
                   <div 
                     onClick={() => { setUsernameInput('nasabah'); setPasswordInput('nasabahpassword'); setSelectedRoleForLogin(UserRole.NASABAH); }} 
                     className="cursor-pointer w-full inline-flex flex-col justify-center py-1 px-2 border border-gray-200 rounded bg-white text-xs font-medium text-muted hover:border-primary hover:text-primary transition-colors group shadow-sm"
                   >
                     <span className="group-hover:text-primary font-bold">Nasabah</span>
                     <span className="text-gray-400">P: nasabahpassword</span>
                   </div>
                 </div>
               </div>
             )}

          </div>
        </div>
      </div>
    );
  }

  // MAIN APP LAYOUT
  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-surface border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                {navLogo}
                <span className="font-bold text-xl text-text tracking-wide">Nabung <span className="text-primary">Bersih</span></span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end mr-2">
                 <span className="text-sm font-medium text-text">{currentUser.fullName}</span>
                 <span className="text-[10px] text-primary uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">{currentUser.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full text-muted hover:text-primary hover:bg-gray-100 focus:outline-none transition-colors"
                title="Logout"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {currentUser.role === UserRole.ADMIN ? (
            <AdminPanel currentUser={currentUser} />
          ) : (
            <UserDashboard user={currentUser} onUserUpdate={setCurrentUser} />
          )}
        </div>
      </main>
    </div>
  );
}