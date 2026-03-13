// auth.js — Sistema de Autenticação com Supabase

class AuthManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this._initialized = false;
    this._redirecting = false; // trava para evitar múltiplos redirects
    this.init();
  }

  async init() {
    try {
      let attempts = 0;
      while (typeof window.supabase === 'undefined' && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase não está carregado após espera');
        return;
      }

      const url = window.SUPABASE_URL;
      const key = window.SUPABASE_ANON_KEY;

      if (!url || !key) {
        console.error('❌ Credenciais não configuradas.');
        return;
      }

      this.supabase = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });

      // Verifica sessão UMA única vez na inicialização
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) console.error('❌ Erro ao verificar sessão:', error.message);

      this._initialized = true;

      if (session) {
        this.currentUser = session.user;
        this._handleAuthPage(); // só redireciona se estiver na página de login
      } else {
        this._handleAppPage(); // só redireciona se estiver na página do app
      }

      // onAuthStateChange: APENAS para login e logout do usuário
      // Ignora INITIAL_SESSION (já tratado acima), TOKEN_REFRESHED e USER_UPDATED
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔔 Auth event:', event);

        if (event === 'SIGNED_IN') {
          this.currentUser = session.user;
          this._handleAuthPage(); // veio do login → vai para o app
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this._handleAppPage(); // saiu do app → vai para o login
        }
        // Todos os outros eventos (INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED) são ignorados
      });

    } catch (error) {
      console.error('❌ Erro ao inicializar auth:', error);
    }
  }

  // Chamado quando há sessão ativa — se estiver na página de login, redireciona para o app
  _handleAuthPage() {
    const path = window.location.pathname;
    const isLoginPage = path === '/login' || path === '/login/' || path === '/' || path.endsWith('login.html');

    if (isLoginPage) {
      if (this._redirecting) return;
      this._redirecting = true;
      window.location.replace('/index');
    } else {
      // Já está no app — só atualiza a UI
      this._updateUI();
    }
  }

  // Chamado quando não há sessão — se estiver no app, redireciona para o login
  _handleAppPage() {
    const path = window.location.pathname;
    const isLoginPage = path === '/login' || path === '/login/' || path === '/' || path.endsWith('login.html');

    if (!isLoginPage) {
      if (this._redirecting) return;
      this._redirecting = true;
      window.location.replace('/login');
    }
    // Já está no login — não faz nada
  }

  // Atualiza nome do usuário e remove auth-guard (sem redirecionar)
  _updateUI() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl && this.currentUser) {
      this.supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', this.currentUser.id)
        .single()
        .then(({ data: profile }) => {
          userNameEl.textContent =
            profile?.username ||
            profile?.full_name ||
            this.currentUser.user_metadata?.username ||
            this.currentUser.user_metadata?.full_name ||
            this.currentUser.email.split('@')[0];
        })
        .catch(() => {
          userNameEl.textContent =
            this.currentUser.user_metadata?.username ||
            this.currentUser.user_metadata?.full_name ||
            this.currentUser.email.split('@')[0];
        });
    }

    const guard = document.getElementById('auth-guard');
    if (guard) guard.remove();
    if (typeof renderAll === 'function') renderAll();
  }

  // Mantido para compatibilidade com código legado
  showAuth() { this._handleAppPage(); }
  showApp() { this._handleAuthPage(); }

  async signUp(email, password, username) {
    try {
      if (!this.supabase)
        return { success: false, message: '❌ Sistema não inicializado. Recarregue a página.' };

      if (!username || username.trim().length < 2)
        return { success: false, message: '❌ Nome de usuário deve ter pelo menos 2 caracteres.' };

      const cleanUsername = username.trim();

      const { data: existingUser } = await this.supabase
        .from('profiles').select('id').ilike('username', cleanUsername).maybeSingle();

      if (existingUser)
        return { success: false, message: '❌ Este nome de usuário já está em uso. Escolha outro.' };

      const { data, error } = await this.supabase.auth.signUp({
        email, password,
        options: {
          data: { username: cleanUsername, full_name: cleanUsername, display_name: cleanUsername }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Usuário não foi criado. Tente novamente.');

      console.log('✅ Usuário criado no Auth:', data.user.id);

      let profileSaved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise(r => setTimeout(r, attempt * 400));
        const { error: profileError } = await this.supabase
          .from('profiles')
          .upsert({ id: data.user.id, email, username: cleanUsername, full_name: cleanUsername, updated_at: new Date().toISOString() }, { onConflict: 'id' });

        if (!profileError) {
          profileSaved = true;
          console.log(`✅ Perfil salvo (tentativa ${attempt})`);
          break;
        }
        console.warn(`⚠️ Tentativa ${attempt} falhou:`, profileError.message);
      }

      if (!profileSaved)
        console.warn('⚠️ Username salvo apenas no metadata do Auth (tabela profiles indisponível).');

      const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({ email, password });

      if (!signInError && signInData?.session) {
        console.log('✅ Login automático após cadastro');
        return { success: true, autoLogin: true, message: '✅ Conta criada e login realizado!' };
      }

      return { success: true, autoLogin: false, message: '✅ Conta criada! Faça login agora.' };

    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      let msg = error.message || 'Erro desconhecido';
      if (msg.includes('Failed to fetch')) msg = 'Erro de conexão. Verifique sua internet.';
      if (msg.includes('User already registered')) msg = 'Este email já está cadastrado.';
      if (msg.includes('Password should be at least')) msg = 'A senha deve ter pelo menos 6 caracteres.';
      return { success: false, message: `❌ ${msg}` };
    }
  }

  async signIn(identifier, password) {
    try {
      if (!this.supabase)
        return { success: false, message: '❌ Sistema não inicializado. Recarregue a página.' };

      let email = identifier.trim();

      if (!email.includes('@')) {
        console.log('🔄 Buscando email por username:', email);
        const { data: profile, error: profileError } = await this.supabase
          .from('profiles').select('email').ilike('username', email).maybeSingle();

        if (profileError) console.error('❌ Erro ao buscar perfil:', profileError.message);
        if (!profile?.email)
          return { success: false, message: '❌ Usuário não encontrado. Verifique seu email ou nome de usuário.' };

        email = profile.email;
      }

      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      console.log('✅ Login realizado');
      return { success: true, message: '✅ Login realizado com sucesso!' };

    } catch (error) {
      console.error('❌ Erro no login:', error);
      let msg = error.message || 'Erro desconhecido';
      if (msg.includes('Invalid login credentials')) msg = 'Email/usuário ou senha incorretos.';
      if (msg.includes('Email not confirmed')) msg = 'Confirme seu email antes de fazer login.';
      if (msg.includes('Failed to fetch')) msg = 'Erro de conexão. Verifique sua internet.';
      return { success: false, message: `❌ ${msg}` };
    }
  }

  async signOut() {
    try {
      await this.supabase.auth.signOut();
      window.location.href = '/login';
      return { success: true };
    } catch (error) {
      return { success: false, message: `❌ ${error.message}` };
    }
  }

  async resetPassword(email) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) throw error;
      return { success: true, message: '✅ Email de recuperação enviado!' };
    } catch (error) {
      return { success: false, message: `❌ ${error.message}` };
    }
  }

  getUserId() { return this.currentUser?.id || null; }
  getUserEmail() { return this.currentUser?.email || null; }
  getSupabase() { return this.supabase; }
  isAuthenticated() { return this.currentUser !== null; }
}

window.authManager = new AuthManager();
console.log('✅ AuthManager carregado');