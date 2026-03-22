export interface Post {
  id?: string;
  title: string;
  content: string;
  image: string;
  category: string;
  createdAt: any;
  authorId: string;
}

export interface Book {
  id?: string;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  price: number;
  purchaseLink: string;
  publishedAt: any;
}

export interface SiteConfig {
  themeColor: string;
  pointColor: string;
  pointColorSecondary: string;
  fontFamily: string;
  logoUrl: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  footerLogoUrl: string;
  booksLink: string;
  authorSupportLink: string;
  address: string;
  email: string;
  phone: string;
  menus: {
    label: string;
    view: string;
    category?: string;
  }[];
  socialLinks: {
    instagram: string;
    facebook: string;
    twitter: string;
  };
}

export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  displayName: string;
}
