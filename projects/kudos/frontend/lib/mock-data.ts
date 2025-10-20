// Mock data for the 炒词 platform

export interface User {
  id: string
  username: string
  email: string
  avatar: string
  bio?: string
}

export interface BusinessCard {
  id: string
  userId: string
  bio: string
  price: number
  isFree: boolean
  socialLinks: { platform: string; url: string }[]
  highlights: string[]
}

export interface Product {
  id: string
  userId: string
  title: string
  description: string
  price: number
  isFree: boolean
  stockLimit: number | null
  stockRemaining: number
  contentType: "text" | "file" | "prompt"
  contentData: any
}

export interface Post {
  id: string
  userId: string
  title: string
  body: string
  images: string[]
  hasPaidContent: boolean
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
  author: User
  products?: Product[]
  tags: string[]
}

export interface Comment {
  id: string
  postId: string
  userId: string
  parentCommentId: string | null
  content: string
  likeCount: number
  createdAt: string
  author: User
  replies?: Comment[]
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: "1",
    username: "AI_Creator_Pro",
    email: "creator@example.com",
    avatar: "/professional-avatar.png",
    bio: "AI prompt engineer specializing in creative workflows",
  },
  {
    id: "2",
    username: "PromptMaster",
    email: "master@example.com",
    avatar: "/creative-avatar.jpg",
    bio: "Building the future of AI-generated content",
  },
  {
    id: "3",
    username: "DigitalArtist",
    email: "artist@example.com",
    avatar: "/artist-avatar.png",
    bio: "Exploring AI art and generative design",
  },
]

// Mock Products
export const mockProducts: Product[] = [
  {
    id: "p1",
    userId: "1",
    title: "Advanced Midjourney Prompts Pack",
    description: "Collection of 50+ professional Midjourney prompts for stunning visuals",
    price: 29.99,
    isFree: false,
    stockLimit: 100,
    stockRemaining: 87,
    contentType: "text",
    contentData: { prompts: [] },
  },
  {
    id: "p2",
    userId: "1",
    title: "ChatGPT Workflow Templates",
    description: "Ready-to-use ChatGPT templates for content creation",
    price: 0,
    isFree: true,
    stockLimit: null,
    stockRemaining: 999,
    contentType: "text",
    contentData: { templates: [] },
  },
  {
    id: "p3",
    userId: "2",
    title: "AI Image Generation Guide",
    description: "Complete guide to creating professional AI images",
    price: 49.99,
    isFree: false,
    stockLimit: 50,
    stockRemaining: 23,
    contentType: "file",
    contentData: { fileUrl: "" },
  },
  {
    id: "p4",
    userId: "3",
    title: "Stable Diffusion Masterclass",
    description: "Complete course on Stable Diffusion techniques",
    price: 1.84,
    isFree: false,
    stockLimit: 200,
    stockRemaining: 156,
    contentType: "text",
    contentData: { course: [] },
  },
  {
    id: "p5",
    userId: "1",
    title: "AI Painting Workflow",
    description: "Professional AI painting workflow templates",
    price: 4.79,
    isFree: false,
    stockLimit: 150,
    stockRemaining: 98,
    contentType: "text",
    contentData: { workflow: [] },
  },
  {
    id: "p6",
    userId: "2",
    title: "Prompt Engineering Guide",
    description: "Advanced prompt engineering techniques",
    price: 10.05,
    isFree: false,
    stockLimit: 100,
    stockRemaining: 67,
    contentType: "file",
    contentData: { fileUrl: "" },
  },
  {
    id: "p7",
    userId: "3",
    title: "AI Video Generation Pack",
    description: "Complete video generation toolkit",
    price: 10.7,
    isFree: false,
    stockLimit: 80,
    stockRemaining: 45,
    contentType: "text",
    contentData: { pack: [] },
  },
]

// Mock Posts
export const mockPosts: Post[] = [
  {
    id: "1",
    userId: "1",
    title: "Creating Stunning AI Art with Advanced Prompting Techniques",
    body: "Discover how to craft perfect prompts for AI image generation. This comprehensive guide covers everything from basic concepts to advanced techniques that will transform your AI art workflow.",
    images: ["/ai-generated-art-landscape.jpg", "/futuristic-cityscape.png", "/abstract-digital-composition.png"],
    hasPaidContent: true,
    likeCount: 234,
    commentCount: 45,
    viewCount: 1823,
    createdAt: "2024-01-15T10:30:00Z",
    author: mockUsers[0],
    products: [mockProducts[0]],
    tags: ["AI Art", "Midjourney", "Prompts", "Tutorial"],
  },
  {
    id: "2",
    userId: "2",
    title: "Free ChatGPT Workflow Templates for Content Creators",
    body: "Boost your productivity with these free ChatGPT templates. Perfect for bloggers, marketers, and content creators looking to streamline their workflow.",
    images: ["/productivity-workspace.png", "/content-creation-tools.png"],
    hasPaidContent: true,
    likeCount: 567,
    commentCount: 89,
    viewCount: 3421,
    createdAt: "2024-01-14T15:20:00Z",
    author: mockUsers[1],
    products: [mockProducts[1]],
    tags: ["ChatGPT", "Productivity", "Free", "Templates"],
  },
  {
    id: "3",
    userId: "3",
    title: "Exploring the Future of Generative AI in Design",
    body: "A deep dive into how generative AI is revolutionizing the design industry. From concept to execution, learn how AI tools are changing creative workflows.",
    images: ["/futuristic-design.png", "/ai-interface-design.jpg", "/digital-innovation.png"],
    hasPaidContent: false,
    likeCount: 892,
    commentCount: 156,
    viewCount: 5234,
    createdAt: "2024-01-13T09:15:00Z",
    author: mockUsers[2],
    tags: ["AI", "Design", "Future", "Innovation"],
  },
  {
    id: "4",
    userId: "1",
    title: "Mastering Stable Diffusion: A Complete Guide",
    body: "Everything you need to know about Stable Diffusion, from installation to creating professional-grade images. Includes tips, tricks, and best practices.",
    images: ["/stable-diffusion-art.jpg", "/ai-portrait-photography.jpg"],
    hasPaidContent: false,
    likeCount: 445,
    commentCount: 67,
    viewCount: 2156,
    createdAt: "2024-01-12T14:45:00Z",
    author: mockUsers[0],
    tags: ["Stable Diffusion", "Tutorial", "AI Art"],
  },
  {
    id: "5",
    userId: "2",
    title: "Building AI-Powered Workflows for Business",
    body: "Learn how to integrate AI tools into your business processes. Real-world examples and practical strategies for maximizing efficiency.",
    images: ["/business-technology-concept.png", "/ai-automation-workflow.jpg"],
    hasPaidContent: true,
    likeCount: 678,
    commentCount: 92,
    viewCount: 3890,
    createdAt: "2024-01-11T11:30:00Z",
    author: mockUsers[1],
    products: [mockProducts[2]],
    tags: ["Business", "AI", "Automation", "Workflow"],
  },
  {
    id: "6",
    userId: "3",
    title: "AI绘画风格化技巧大全",
    body: "Master the art of AI painting with these professional techniques and workflows.",
    images: ["/abstract-digital-composition.png", "/futuristic-cityscape.png"],
    hasPaidContent: true,
    likeCount: 974,
    commentCount: 217,
    viewCount: 4567,
    createdAt: "2024-01-10T16:20:00Z",
    author: mockUsers[2],
    products: [mockProducts[4]],
    tags: ["AI Art", "Painting", "Style"],
  },
  {
    id: "7",
    userId: "1",
    title: "Prompt工程师必备技能",
    body: "Essential skills every prompt engineer should master for professional AI content creation.",
    images: ["/ai-generated-art-landscape.jpg"],
    hasPaidContent: true,
    likeCount: 76,
    commentCount: 461,
    viewCount: 2890,
    createdAt: "2024-01-09T10:15:00Z",
    author: mockUsers[0],
    products: [mockProducts[5]],
    tags: ["Prompt", "Engineering", "Skills"],
  },
  {
    id: "8",
    userId: "2",
    title: "跨模态AI应用场景解析",
    body: "Exploring cross-modal AI applications and their real-world use cases.",
    images: ["/digital-innovation.png", "/ai-interface-design.jpg"],
    hasPaidContent: true,
    likeCount: 399,
    commentCount: 397,
    viewCount: 5123,
    createdAt: "2024-01-08T14:30:00Z",
    author: mockUsers[1],
    products: [mockProducts[6]],
    tags: ["AI", "Cross-modal", "Applications"],
  },
]

// Mock Comments
export const mockComments: Comment[] = [
  {
    id: "c1",
    postId: "1",
    userId: "2",
    parentCommentId: null,
    content:
      "This is incredibly helpful! The prompting techniques you shared have already improved my results significantly.",
    likeCount: 23,
    createdAt: "2024-01-15T12:00:00Z",
    author: mockUsers[1],
  },
  {
    id: "c2",
    postId: "1",
    userId: "3",
    parentCommentId: "c1",
    content: "I agree! Would love to see more advanced examples in the future.",
    likeCount: 8,
    createdAt: "2024-01-15T13:30:00Z",
    author: mockUsers[2],
  },
  {
    id: "c3",
    postId: "1",
    userId: "1",
    parentCommentId: "c1",
    content: "Thank you! I'm planning to release more advanced content soon. Stay tuned!",
    likeCount: 15,
    createdAt: "2024-01-15T14:00:00Z",
    author: mockUsers[0],
  },
]

// Mock Business Cards
export const mockBusinessCards: BusinessCard[] = [
  {
    id: "bc1",
    userId: "1",
    bio: "Professional AI prompt engineer with 5+ years of experience. Specializing in Midjourney, Stable Diffusion, and ChatGPT workflows. Available for consulting and custom prompt creation.",
    price: 9.99,
    isFree: false,
    socialLinks: [
      { platform: "Twitter", url: "https://twitter.com/aicreatorpro" },
      { platform: "GitHub", url: "https://github.com/aicreatorpro" },
      { platform: "Website", url: "https://aicreatorpro.com" },
    ],
    highlights: ["/portfolio-work-1.png", "/portfolio-work-2.jpg", "/portfolio-work-3.jpg"],
  },
]

// Helper function to get user by ID
export const getUserById = (id: string): User | undefined => {
  return mockUsers.find((user) => user.id === id)
}

// Helper function to get posts with pagination
export const getPosts = (limit = 20, offset = 0): Post[] => {
  return mockPosts.slice(offset, offset + limit)
}

// Helper function to get post by ID
export const getPostById = (id: string): Post | undefined => {
  return mockPosts.find((post) => post.id === id)
}

// Helper function to get comments for a post
export const getCommentsByPostId = (postId: string): Comment[] => {
  return mockComments
    .filter((comment) => comment.postId === postId && !comment.parentCommentId)
    .map((comment) => ({
      ...comment,
      replies: mockComments.filter((reply) => reply.parentCommentId === comment.id),
    }))
}
