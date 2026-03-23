/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDoc,
  getDocFromServer,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book as BookIcon, 
  Newspaper, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  Instagram, 
  Facebook, 
  Twitter,
  Menu,
  X,
  Save,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { db, auth } from './firebase';
import { Post, Book, SiteConfig, User } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Context ---
interface AppContextType {
  user: FirebaseUser | null;
  isAdmin: boolean;
  config: SiteConfig;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultConfig: SiteConfig = {
  themeColor: '#FFFFFF',
  pointColor: '#001F3F',
  pointColorSecondary: '#D4AF37',
  fontFamily: 'sans',
  logoUrl: '',
  seoTitle: '아스트라프레스',
  seoDescription: '',
  heroTitle: '',
  heroSubtitle: '',
  heroImageUrl: '',
  footerLogoUrl: '',
  booksLink: 'books',
  authorSupportLink: '',
  address: '',
  email: '',
  phone: '',
  menus: [
    { label: '홈', view: 'home' },
    { label: '출판사 소개', view: 'about' },
    { label: '도서 목록', view: 'books' },
    { label: '출판 소식', view: 'posts' }
  ],
  socialLinks: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    twitter: 'https://twitter.com'
  }
};

// --- Components ---

const Navbar = ({ onNavigate, currentView }: { onNavigate: (view: string) => void, currentView: string }) => {
  const { user, isAdmin, config } = useContext(AppContext)!;
  const [isOpen, setIsOpen] = useState(false);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = () => signOut(auth);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-10 h-10 bg-navy rounded-full flex items-center justify-center text-gold">
              <BookIcon size={24} />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tighter text-navy uppercase">Astrapress</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {config.menus?.map((menu, idx) => (
              <button 
                key={idx}
                onClick={() => onNavigate(menu.view)} 
                className={cn("text-sm font-medium hover:text-gold transition-colors", currentView === menu.view ? "text-gold" : "text-navy")}
              >
                {menu.label}
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => onNavigate('admin')} className={cn("flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-full text-sm font-medium hover:bg-navy/90 transition-all", currentView === 'admin' ? "ring-2 ring-gold" : "")}>
                <LayoutDashboard size={16} />
                관리자
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-gray-200" />
                <button onClick={logout} className="text-gray-500 hover:text-navy transition-colors"><LogOut size={20} /></button>
              </div>
            ) : (
              <button onClick={login} className="flex items-center gap-2 text-sm font-medium text-navy hover:text-gold transition-colors">
                <LogIn size={20} />
                로그인
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <button onClick={() => setIsOpen(!isOpen)} className="text-navy">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white border-b border-gray-100 px-4 py-6 flex flex-col gap-4"
          >
            {config.menus?.map((menu, idx) => (
              <button 
                key={idx}
                onClick={() => { onNavigate(menu.view); setIsOpen(false); }} 
                className="text-left text-lg font-medium text-navy"
              >
                {menu.label}
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => { onNavigate('admin'); setIsOpen(false); }} className="text-left text-lg font-medium text-gold flex items-center gap-2">
                <LayoutDashboard size={20} /> 관리자
              </button>
            )}
            <div className="pt-4 border-t border-gray-100">
              {user ? (
                <button onClick={logout} className="flex items-center gap-2 text-gray-500"><LogOut size={20} /> 로그아웃</button>
              ) : (
                <button onClick={login} className="flex items-center gap-2 text-navy"><LogIn size={20} /> 로그인</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ onNavigate }: { onNavigate: (view: string) => void }) => {
  const { config } = useContext(AppContext)!;
  return (
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-8xl font-serif font-bold text-navy leading-tight mb-6 whitespace-pre-line">
            {config.heroTitle}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-lg leading-relaxed whitespace-pre-line">
            {config.heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => {
                const booksMenu = config.menus?.find(m => m.label.includes('도서') || m.view === 'books');
                onNavigate(booksMenu?.view || 'books');
              }}
              className="px-8 py-4 bg-navy text-white rounded-full font-medium hover:bg-navy/90 transition-all shadow-lg shadow-navy/20"
            >
              최신 도서 보기
            </button>
            <button 
              onClick={() => {
                const aboutMenu = config.menus?.find(m => m.label.includes('소개') || m.view === 'about');
                onNavigate(aboutMenu?.view || 'about');
              }}
              className="px-8 py-4 border border-navy text-navy rounded-full font-medium hover:bg-navy/5 transition-all"
            >
              출판사 소개
            </button>
            <button 
              onClick={() => {
                const newsMenu = config.menus?.find(m => m.label.includes('소식') || m.view === 'posts');
                onNavigate(newsMenu?.view || 'posts');
              }}
              className="px-8 py-4 border border-navy text-navy rounded-full font-medium hover:bg-navy/5 transition-all"
            >
              출판 소식
            </button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
            <img 
              src={config.heroImageUrl} 
              alt="Hero" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 bg-gold text-white p-8 rounded-2xl shadow-xl hidden md:block">
            <p className="text-4xl font-serif font-bold mb-1">2026</p>
            <p className="text-sm uppercase tracking-widest opacity-80">Established</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const BookCard = ({ book, onSelect }: { book: Book, onSelect?: (book: Book) => void, key?: string | number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="group cursor-pointer"
    onClick={() => onSelect?.(book)}
  >
    <div className="aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden mb-4 shadow-md group-hover:shadow-xl transition-all duration-300">
      <img 
        src={book.coverImage} 
        alt={book.title} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
    </div>
    <h3 className="text-lg font-bold text-navy mb-1 group-hover:text-gold transition-colors">{book.title}</h3>
    <p className="text-sm text-gray-500">{book.author}</p>
  </motion.div>
);

const BookDetail = ({ book, onClose }: { book: Book, onClose: () => void }) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-navy/60 backdrop-blur-md"
    />
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-navy hover:bg-white transition-all shadow-lg"
      >
        <X size={24} />
      </button>

      <div className="md:w-2/5 bg-gray-100 overflow-hidden">
        <img 
          src={book.coverImage} 
          alt={book.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="md:w-3/5 p-8 md:p-16 overflow-y-auto">
        <div className="mb-10">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-4 leading-tight">{book.title}</h2>
          <p className="text-xl text-gold font-medium">{book.author} 저</p>
        </div>

        <div className="mb-12">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Book Description</h3>
          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
            {book.description}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Price</p>
            <p className="text-3xl font-bold text-navy">{book.price?.toLocaleString()}원</p>
          </div>
          {book.purchaseLink && (
            <a 
              href={book.purchaseLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-10 py-5 bg-navy text-white font-bold rounded-full flex items-center justify-center gap-3 hover:bg-gold transition-all shadow-xl hover:shadow-gold/20"
            >
              구매하기 <ExternalLink size={20} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  </div>
);

const PostCard = ({ post, onSelect }: { post: Post, onSelect?: (post: Post) => void, key?: string | number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
    onClick={() => onSelect?.(post)}
  >
    <div className="aspect-video bg-gray-100 overflow-hidden">
      <img 
        src={post.image} 
        alt={post.title} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
    </div>
    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-3 py-1 bg-gold/10 text-gold text-xs font-bold rounded-full uppercase">{post.category}</span>
        <span className="text-xs text-gray-400">{post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>
      </div>
      <h3 className="text-xl font-bold text-navy mb-2 group-hover:text-gold transition-colors">{post.title}</h3>
      <p className="text-gray-600 text-sm line-clamp-2 mb-4">{post.content}</p>
      <button className="text-navy font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
        더 보기 <ChevronRight size={16} />
      </button>
    </div>
  </motion.div>
);

const PostDetail = ({ post, onClose }: { post: Post, onClose: () => void }) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-navy/60 backdrop-blur-md"
    />
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-navy hover:bg-white transition-all shadow-lg"
      >
        <X size={24} />
      </button>

      <div className="overflow-y-auto">
        <div className="aspect-video w-full bg-gray-100">
          <img 
            src={post.image} 
            alt={post.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-4 py-1.5 bg-gold/10 text-gold text-sm font-bold rounded-full uppercase tracking-wider">{post.category}</span>
            <span className="text-sm text-gray-400 font-medium">{post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-8 leading-tight">{post.title}</h2>
          <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>
        </div>
      </div>
    </motion.div>
  </div>
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'posts' | 'books' | 'config'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(defaultConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ collection: string, id: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 800000) {
      alert('이미지 파일이 너무 큽니다. 800KB 이하의 이미지를 사용해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'posts'));

    const qBooks = query(collection(db, 'books'), orderBy('publishedAt', 'desc'));
    const unsubBooks = onSnapshot(qBooks, (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Book)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'books'));

    const unsubConfig = onSnapshot(doc(db, 'config', 'site'), (snap) => {
      if (snap.exists()) setSiteConfig(snap.data() as SiteConfig);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'config/site'));

    return () => { unsubPosts(); unsubBooks(); unsubConfig(); };
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'config', 'site'), siteConfig);
      alert('설정이 저장되었습니다.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'config/site');
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...editingItem };
    if (!data.id) {
      data.createdAt = serverTimestamp();
      if (activeTab === 'posts') data.authorId = auth.currentUser?.uid;
      if (activeTab === 'books') data.publishedAt = serverTimestamp();
    }

    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, activeTab, id), rest);
      } else {
        await addDoc(collection(db, activeTab), data);
      }
      setIsEditing(false);
      setEditingItem(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, activeTab);
    }
  };

  return (
    <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('posts')}
            className={cn("flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all", activeTab === 'posts' ? "bg-navy text-white shadow-lg shadow-navy/20" : "text-gray-500 hover:bg-gray-50")}
          >
            <Newspaper size={20} /> 게시글 관리
          </button>
          <button 
            onClick={() => setActiveTab('books')}
            className={cn("flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all", activeTab === 'books' ? "bg-navy text-white shadow-lg shadow-navy/20" : "text-gray-500 hover:bg-gray-50")}
          >
            <BookIcon size={20} /> 도서 관리
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={cn("flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all", activeTab === 'config' ? "bg-navy text-white shadow-lg shadow-navy/20" : "text-gray-500 hover:bg-gray-50")}
          >
            <Settings size={20} /> 사이트 설정
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
          {activeTab === 'config' ? (
            <form onSubmit={handleSaveConfig} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-navy border-b pb-2">디자인 설정</h3>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">포인트 컬러 (Navy)</label>
                    <input type="color" value={siteConfig.pointColor} onChange={e => setSiteConfig({...siteConfig, pointColor: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">포인트 컬러 (Gold)</label>
                    <input type="color" value={siteConfig.pointColorSecondary} onChange={e => setSiteConfig({...siteConfig, pointColorSecondary: e.target.value})} className="w-full h-12 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">로고 이미지</label>
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                        {siteConfig.logoUrl ? <img src={siteConfig.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon size={24} className="text-gray-300" />}
                      </div>
                      <div className="flex-1">
                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (base64) => setSiteConfig(prev => ({...prev, logoUrl: base64})))} className="hidden" id="logo-upload" />
                        <label htmlFor="logo-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-navy text-sm font-bold rounded-lg cursor-pointer hover:bg-gray-200 transition-all">
                          <Plus size={16} /> 파일 업로드
                        </label>
                        <input type="text" value={siteConfig.logoUrl} onChange={e => setSiteConfig({...siteConfig, logoUrl: e.target.value})} className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" placeholder="또는 URL 입력" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-navy border-b pb-2">SEO 설정</h3>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">사이트 제목</label>
                    <input type="text" value={siteConfig.seoTitle} onChange={e => setSiteConfig({...siteConfig, seoTitle: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">사이트 설명</label>
                    <textarea value={siteConfig.seoDescription} onChange={e => setSiteConfig({...siteConfig, seoDescription: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none h-32" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-navy border-b pb-2">홈페이지 메인(Hero) 설정</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">메인 제목</label>
                      <input type="text" value={siteConfig.heroTitle} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">메인 부제목</label>
                      <textarea value={siteConfig.heroSubtitle} onChange={e => setSiteConfig({...siteConfig, heroSubtitle: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none h-32" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">메인 이미지 (최대 800KB)</label>
                      <div className="flex gap-4 items-start">
                        <div className="w-20 aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                          {siteConfig.heroImageUrl ? <img src={siteConfig.heroImageUrl} alt="Hero" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-gray-300" />}
                        </div>
                        <div className="flex-1">
                          <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (base64) => setSiteConfig(prev => ({...prev, heroImageUrl: base64})))} className="hidden" id="hero-upload" />
                          <label htmlFor="hero-upload" className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-navy text-xs font-bold rounded-lg cursor-pointer hover:bg-gray-200 transition-all">
                            <Plus size={14} /> 업로드
                          </label>
                          <p className="text-[10px] text-gray-400 mt-1">* 고해상도 이미지는 800KB 이하로 최적화하여 업로드해주세요.</p>
                          <input type="text" value={siteConfig.heroImageUrl} onChange={e => setSiteConfig({...siteConfig, heroImageUrl: e.target.value})} className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] outline-none" placeholder="URL" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">푸터 미니 로고</label>
                      <div className="flex gap-4 items-start">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                          {siteConfig.footerLogoUrl ? <img src={siteConfig.footerLogoUrl} alt="Footer Logo" className="w-full h-full object-contain" /> : <BookIcon size={24} className="text-gray-300" />}
                        </div>
                        <div className="flex-1">
                          <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (base64) => setSiteConfig(prev => ({...prev, footerLogoUrl: base64})))} className="hidden" id="footer-logo-upload" />
                          <label htmlFor="footer-logo-upload" className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-navy text-xs font-bold rounded-lg cursor-pointer hover:bg-gray-200 transition-all">
                            <Plus size={14} /> 업로드
                          </label>
                          <input type="text" value={siteConfig.footerLogoUrl} onChange={e => setSiteConfig(prev => ({...prev, footerLogoUrl: e.target.value}))} className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] outline-none" placeholder="URL" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-navy border-b pb-2">푸터 탐색 링크 설정</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">도서 목록 링크 (뷰 ID 또는 URL)</label>
                    <input type="text" value={siteConfig.booksLink} onChange={e => setSiteConfig({...siteConfig, booksLink: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">저자 지원 링크 (뷰 ID 또는 URL)</label>
                    <input type="text" value={siteConfig.authorSupportLink} onChange={e => setSiteConfig({...siteConfig, authorSupportLink: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-navy border-b pb-2">메뉴(게시판) 관리</h3>
                <p className="text-sm text-gray-500 mb-4">
                  여기서 상단 네비게이션과 푸터의 메뉴를 수정/삭제할 수 있습니다. 
                  '이동할 뷰'는 게시글 작성 시 '카테고리'와 연결되는 고유 ID입니다.
                </p>
                <div className="space-y-3">
                  {siteConfig.menus?.map((menu, idx) => (
                    <div key={idx} className="flex gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <input type="text" value={menu.label} onChange={e => {
                          const newMenus = [...siteConfig.menus];
                          newMenus[idx].label = e.target.value;
                          setSiteConfig({...siteConfig, menus: newMenus});
                        }} className="px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none" placeholder="메뉴 이름" />
                        <input type="text" value={menu.view} onChange={e => {
                          const newMenus = [...siteConfig.menus];
                          newMenus[idx].view = e.target.value;
                          setSiteConfig({...siteConfig, menus: newMenus});
                        }} className="px-4 py-2 bg-white border border-gray-200 rounded-lg outline-none" placeholder="이동할 뷰 (home, books, posts 등)" />
                      </div>
                      <button type="button" onClick={() => {
                        const newMenus = siteConfig.menus.filter((_, i) => i !== idx);
                        setSiteConfig({...siteConfig, menus: newMenus});
                      }} className="text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    setSiteConfig({...siteConfig, menus: [...(siteConfig.menus || []), { label: '새 메뉴', view: 'home' }]});
                  }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-navy text-sm font-bold rounded-lg hover:bg-gray-200 transition-all">
                    <Plus size={16} /> 메뉴 추가
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-navy border-b pb-2">소셜 미디어 링크</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Instagram size={16} /> Instagram</label>
                    <input type="text" value={siteConfig.socialLinks.instagram} onChange={e => setSiteConfig({...siteConfig, socialLinks: {...siteConfig.socialLinks, instagram: e.target.value}})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Facebook size={16} /> Facebook</label>
                    <input type="text" value={siteConfig.socialLinks.facebook} onChange={e => setSiteConfig({...siteConfig, socialLinks: {...siteConfig.socialLinks, facebook: e.target.value}})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Twitter size={16} /> Twitter</label>
                    <input type="text" value={siteConfig.socialLinks.twitter} onChange={e => setSiteConfig({...siteConfig, socialLinks: {...siteConfig.socialLinks, twitter: e.target.value}})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-navy border-b pb-2">문의 및 연락처 설정</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">회사 주소</label>
                    <input type="text" value={siteConfig.address} onChange={e => setSiteConfig({...siteConfig, address: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">문의 이메일</label>
                    <input type="email" value={siteConfig.email} onChange={e => setSiteConfig({...siteConfig, email: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">문의 전화번호</label>
                    <input type="text" value={siteConfig.phone} onChange={e => setSiteConfig({...siteConfig, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold outline-none" />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t">
                <button type="submit" className="flex items-center gap-2 px-8 py-4 bg-gold text-white rounded-full font-bold hover:bg-gold/90 transition-all">
                  <Save size={20} /> 설정 저장하기
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-navy">{activeTab === 'posts' ? '게시글 목록' : '도서 목록'}</h2>
                <button 
                  onClick={() => { setIsEditing(true); setEditingItem({}); }}
                  className="flex items-center gap-2 px-6 py-3 bg-navy text-white rounded-full font-bold hover:bg-navy/90 transition-all"
                >
                  <Plus size={20} /> {activeTab === 'posts' ? '새 게시글' : '새 도서'} 추가
                </button>
              </div>

              <div className="grid gap-4">
                {(activeTab === 'posts' ? posts : books).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gold transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                        <img src={item.image || item.coverImage} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-navy">{item.title}</h4>
                        <p className="text-sm text-gray-500">{activeTab === 'posts' ? item.category : item.author}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setIsEditing(true); setEditingItem(item); }} className="p-2 text-gray-400 hover:text-navy transition-colors"><Edit size={20} /></button>
                      <button onClick={() => setDeleteConfirm({ collection: activeTab, id: item.id })} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-navy">{editingItem?.id ? '수정하기' : '새로 만들기'}</h3>
                  <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-navy"><X size={24} /></button>
                </div>

                <form onSubmit={handleSaveItem} className="space-y-6">
                  {activeTab === 'posts' ? (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">제목</label>
                        <input required type="text" value={editingItem?.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gold" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">카테고리 (게시판)</label>
                        <p className="text-xs text-gray-400 mb-2">* '사이트 설정 &gt; 메뉴 관리'에서 등록한 메뉴의 '이동할 뷰' 이름과 일치해야 해당 게시판에 노출됩니다.</p>
                        <select 
                          value={editingItem?.category || 'posts'} 
                          onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gold"
                        >
                          {siteConfig.menus?.filter(m => !['home', 'books', 'admin'].includes(m.view)).map(menu => (
                            <option key={menu.view} value={menu.view}>{menu.label} ({menu.view})</option>
                          ))}
                          <option value="posts">기타 소식 (posts)</option>
                        </select>
                      </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">게시글 이미지</label>
                          <div className="flex gap-2 items-center">
                            <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (base64) => setEditingItem({...editingItem, image: base64}))} className="hidden" id="post-image-upload" />
                            <label htmlFor="post-image-upload" className="px-4 py-2 bg-gray-100 text-navy text-sm font-bold rounded-lg cursor-pointer hover:bg-gray-200">
                              업로드
                            </label>
                            <input required type="text" value={editingItem?.image || ''} onChange={e => setEditingItem({...editingItem, image: e.target.value})} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs" placeholder="또는 URL" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">내용</label>
                        <textarea required value={editingItem?.content || ''} onChange={e => setEditingItem({...editingItem, content: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gold h-48" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">도서 제목</label>
                        <input required type="text" value={editingItem?.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gold" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">저자</label>
                          <input required type="text" value={editingItem?.author || ''} onChange={e => setEditingItem({...editingItem, author: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gold" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">표지 이미지</label>
                          <div className="flex gap-2 items-center">
                            <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (base64) => setEditingItem({...editingItem, coverImage: base64}))} className="hidden" id="book-image-upload" />
                            <label htmlFor="book-image-upload" className="px-4 py-2 bg-gray-100 text-navy text-sm font-bold rounded-lg cursor-pointer hover:bg-gray-200">
                              업로드
                            </label>
                            <input required type="text" value={editingItem?.coverImage || ''} onChange={e => setEditingItem({...editingItem, coverImage: e.target.value})} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs" placeholder="또는 URL" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">도서 설명</label>
                        <textarea required value={editingItem?.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gold h-32" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">가격</label>
                          <input type="number" value={editingItem?.price || 0} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gold" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">구매 링크</label>
                          <input type="text" value={editingItem?.purchaseLink || ''} onChange={e => setEditingItem({...editingItem, purchaseLink: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gold" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="pt-6">
                    <button type="submit" className="w-full py-4 bg-navy text-white rounded-xl font-bold hover:bg-navy/90 transition-all shadow-lg shadow-navy/20">
                      저장하기
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-navy mb-2">정말 삭제하시겠습니까?</h3>
              <p className="text-gray-500 mb-8">이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all">취소</button>
                <button onClick={() => handleDelete(deleteConfirm.collection, deleteConfirm.id)} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all">삭제</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Footer = ({ onNavigate }: { onNavigate: (view: string) => void }) => {
  const { config } = useContext(AppContext)!;
  return (
    <footer className="bg-navy text-white py-20 px-4">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
        <div className="col-span-2">
          <div className="flex items-center gap-4 mb-6 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-navy overflow-hidden">
              {config.footerLogoUrl ? <img src={config.footerLogoUrl} alt="" className="w-full h-full object-contain p-1" /> : (config.logoUrl ? <img src={config.logoUrl} alt="" className="w-full h-full object-contain p-1" /> : <BookIcon size={24} />)}
            </div>
            <span className="text-2xl font-serif font-bold tracking-tighter uppercase">Astrapress</span>
          </div>
          <p className="text-gray-400 max-w-sm leading-relaxed mb-8">
            아스트라프레스는 독창적인 시각과 깊이 있는 통찰을 담은 도서를 통해 
            세상을 더 넓고 깊게 이해할 수 있는 기회를 제공합니다.
          </p>
          <div className="flex gap-4">
            <a href={config.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-navy transition-all"><Instagram size={20} /></a>
            <a href={config.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-navy transition-all"><Facebook size={20} /></a>
            <a href={config.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-navy transition-all"><Twitter size={20} /></a>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-6 uppercase tracking-widest text-gold">Home</h4>
          <ul className="space-y-4 text-gray-400">
            {config.menus?.map((menu, idx) => (
              <li key={idx}>
                <button onClick={() => onNavigate(menu.view)} className="hover:text-white transition-colors">
                  {menu.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6 uppercase tracking-widest text-gold">문의</h4>
          <ul className="space-y-4 text-gray-400">
            <li>{config.address}</li>
            <li>{config.email}</li>
            <li>{config.phone}</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
        &copy; 2026 Astrapress. All rights reserved.
      </div>
    </footer>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check admin status
        const adminEmail = "astrapress2026@gmail.com";
        if (u.email === adminEmail) {
          setIsAdmin(true);
          // Ensure user doc exists
          await setDoc(doc(db, 'users', u.uid), {
            email: u.email,
            role: 'admin',
            displayName: u.displayName
          }, { merge: true });
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'site'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as SiteConfig);
        setIsConfigLoaded(true);
      } else {
        setIsConfigLoaded(true);
      }
    });

    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    });

    const qBooks = query(collection(db, 'books'), orderBy('publishedAt', 'desc'));
    const unsubBooks = onSnapshot(qBooks, (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Book)));
    });

    // Initial connection test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'site'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase connection error. Please check configuration.");
        }
      }
    };
    testConnection();

    return () => { unsubAuth(); unsubConfig(); unsubPosts(); unsubBooks(); };
  }, []);

  useEffect(() => {
    if (config.seoTitle) {
      document.title = config.seoTitle;
    }
  }, [config.seoTitle]);

  if (loading || !isConfigLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-gold border-t-navy rounded-full"
        />
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ user, isAdmin, config, loading }}>
      <div className="min-h-screen selection:bg-gold/30">
        <Navbar onNavigate={setCurrentView} currentView={currentView} />
        
        <main>
          {currentView === 'home' && (
            <>
              <Hero onNavigate={setCurrentView} />
              
              {/* Featured Books */}
              <section className="py-20 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                  <div className="flex justify-between items-end mb-12">
                    <div>
                      <h2 className="text-sm font-bold text-gold uppercase tracking-[0.3em] mb-4">New Arrivals</h2>
                      <h3 className="text-4xl font-serif font-bold text-navy">이달의 신간</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const booksMenu = config.menus?.find(m => m.label.includes('도서') || m.view === 'books');
                        setCurrentView(booksMenu?.view || 'books');
                      }} 
                      className="text-navy font-bold flex items-center gap-2 hover:text-gold transition-colors"
                    >
                      전체 보기 <ChevronRight size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {books.slice(0, 4).map(book => <BookCard key={book.id} book={book} onSelect={setSelectedBook} />)}
                  </div>
                </div>
              </section>

              {/* Latest Posts */}
              <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                  <div className="flex justify-between items-end mb-12">
                    <div>
                      <h2 className="text-sm font-bold text-gold uppercase tracking-[0.3em] mb-4">Our Stories</h2>
                      <h3 className="text-4xl font-serif font-bold text-navy">출판사 소식</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const newsMenu = config.menus?.find(m => m.label.includes('소식') || m.view === 'posts');
                        setCurrentView(newsMenu?.view || 'posts');
                      }} 
                      className="text-navy font-bold flex items-center gap-2 hover:text-gold transition-colors"
                    >
                      전체 보기 <ChevronRight size={20} />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-8">
                    {posts.filter(p => p.category === 'posts' || !p.category).slice(0, 3).map(post => <PostCard key={post.id} post={post} onSelect={setSelectedPost} />)}
                  </div>
                </div>
              </section>
            </>
          )}

          {currentView === 'books' && (
            <section className="pt-32 pb-20 px-4">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-4xl font-serif font-bold text-navy mb-12">전체 도서 목록</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                  {books.map(book => <BookCard key={book.id} book={book} onSelect={setSelectedBook} />)}
                </div>
              </div>
            </section>
          )}

          {/* Dynamic Board View */}
          {currentView !== 'home' && currentView !== 'books' && currentView !== 'admin' && (
            <section className="pt-32 pb-20 px-4">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-4xl font-serif font-bold text-navy mb-12">
                  {config.menus?.find(m => m.view === currentView)?.label || '게시판'}
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {posts.filter(p => p.category === currentView || (currentView === 'posts' && !p.category)).map(post => <PostCard key={post.id} post={post} onSelect={setSelectedPost} />)}
                </div>
                {posts.filter(p => p.category === currentView || (currentView === 'posts' && !p.category)).length === 0 && (
                  <div className="py-20 text-center text-gray-400">
                    등록된 게시글이 없습니다.
                  </div>
                )}
              </div>
            </section>
          )}

          {currentView === 'admin' && isAdmin && <AdminDashboard />}
        </main>

        <AnimatePresence>
          {selectedPost && <PostDetail post={selectedPost} onClose={() => setSelectedPost(null)} />}
          {selectedBook && <BookDetail book={selectedBook} onClose={() => setSelectedBook(null)} />}
        </AnimatePresence>

        <Footer onNavigate={setCurrentView} />
      </div>
    </AppContext.Provider>
  );
}
