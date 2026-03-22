import type { BlogPost } from './types'

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Future of Digital Experience',
    excerpt: 'Exploring how immersive technologies are reshaping the way we interact with digital content and what it means for designers.',
    likes: 42,
    content: `
As we stand on the precipice of a new digital era, the boundaries between the physical and virtual worlds are becoming increasingly blurred. Immersive technologies like Augmented Reality (AR) and Virtual Reality (VR) are no longer just gimmicks for gamers; they are transforming how we work, learn, and connect.

### The Shift to Spatial Computing

Spatial computing is redefining the user interface. We are moving away from flat screens and into three-dimensional spaces where information can be manipulated with our hands, eyes, and voice. This shift requires a fundamental rethinking of design principles.

Designers must now consider depth, scale, and environment. How does an interface behave when it's floating in your living room? How do we ensure accessibility in a 360-degree environment? These are the questions that will define the next decade of digital product design.

### Beyond the Screen

The future isn't just about headsets. It's about ambient computing—technology that weaves itself into the fabric of our daily lives, becoming invisible yet omnipresent. It's about interfaces that anticipate our needs before we even express them.
    `,
    date: 'Oct 24, 2025',
    category: 'Design',
    slug: 'future-of-digital-experience',
    readTime: 5,
    tags: ['AR/VR', 'Spatial Computing', 'UX Design'],
    author: {
      name: 'Sarah Chen',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      handle: '@sarah',
    },
    comments: [
      {
        id: 'c1',
        authorId: 'u-john',
        author: 'John Doe',
        avatar: 'https://i.pravatar.cc/150?u=john',
        date: 'Oct 25, 2025',
        content: 'This is a fascinating perspective! I especially agree with the point about ambient computing.'
      },
      {
        id: 'c2',
        authorId: 'u-jane',
        author: 'Jane Smith',
        avatar: 'https://i.pravatar.cc/150?u=jane',
        date: 'Oct 26, 2025',
        content: 'Great read. I wonder how long it will take for spatial computing to become mainstream.'
      }
    ]
  },
  {
    id: '2',
    title: 'Building Scalable Go Applications',
    excerpt: 'Best practices for structuring your Go projects to ensure maintainability and performance as your team grows.',
    likes: 37,
    content: `
Go is renowned for its simplicity and performance, but as applications grow, so does complexity. Structuring a Go project for scalability is less about following a rigid framework and more about adhering to solid engineering principles.

### Standard Project Layout

Adopting the standard Go project layout is a good starting point. Separating your cmd, pkg, and internal directories helps clarify the intent of your code and prevents import cycles. It also makes it easier for new developers to navigate the codebase.

### Dependency Injection

While Go doesn't have a built-in DI container like Spring, manual dependency injection is often cleaner and more idiomatic. Passing dependencies via struct constructors makes your code more testable and decoupled.

\`\`\`go
type Server struct {
    db *sql.DB
    logger *log.Logger
}

func NewServer(db *sql.DB, logger *log.Logger) *Server {
    return &Server{
        db: db,
        logger: logger,
    }
}
\`\`\`
    `,
    date: 'Oct 18, 2025',
    category: 'Tech',
    slug: 'building-scalable-go-apps',
    readTime: 8,
    tags: ['Go', 'Backend', 'Architecture'],
    author: {
      name: 'Mike Ross',
      avatar: 'https://i.pravatar.cc/150?u=mike',
      handle: '@mike',
    },
    comments: [
      {
        id: 'c3',
        authorId: 'u-dev',
        author: 'Dev Guy',
        avatar: 'https://i.pravatar.cc/150?u=dev',
        date: 'Oct 19, 2025',
        content: 'Standard layout is key. Saved my team so much headache.'
      },
      {
        id: 'c4',
        authorId: 'u-alice',
        author: 'Alice Chen',
        avatar: 'https://i.pravatar.cc/150?u=alice',
        date: 'Oct 20, 2025',
        content: 'Great article! The dependency injection pattern is exactly what I needed for my current project.'
      },
      {
        id: 'c5',
        authorId: 'u-bob',
        author: 'Bob Smith',
        avatar: 'https://i.pravatar.cc/150?u=bob',
        date: 'Oct 20, 2025',
        content: 'I switched from Node.js to Go last year and this guide would have been so helpful back then.'
      },
      {
        id: 'c6',
        authorId: 'u-charlie',
        author: 'Charlie Wang',
        avatar: 'https://i.pravatar.cc/150?u=charlie',
        date: 'Oct 21, 2025',
        content: 'Do you have any recommendations for testing strategies in large Go codebases?'
      },
      {
        id: 'c7',
        authorId: 'u-diana',
        author: 'Diana Lee',
        avatar: 'https://i.pravatar.cc/150?u=diana',
        date: 'Oct 21, 2025',
        content: 'The cmd/pkg/internal structure is a game changer. Clean architecture FTW!'
      },
      {
        id: 'c8',
        authorId: 'u-eric',
        author: 'Eric Johnson',
        avatar: 'https://i.pravatar.cc/150?u=eric',
        date: 'Oct 22, 2025',
        content: 'Would love to see a follow-up article on microservices with Go.'
      },
      {
        id: 'c9',
        authorId: 'u-fiona',
        author: 'Fiona Zhang',
        avatar: 'https://i.pravatar.cc/150?u=fiona',
        date: 'Oct 22, 2025',
        content: 'This is exactly the content I was looking for. Bookmarked!'
      },
      {
        id: 'c10',
        authorId: 'u-george',
        author: 'George Kim',
        avatar: 'https://i.pravatar.cc/150?u=george',
        date: 'Oct 23, 2025',
        content: 'How do you handle database migrations in your Go projects?'
      },
      {
        id: 'c11',
        authorId: 'u-hannah',
        author: 'Hannah Park',
        avatar: 'https://i.pravatar.cc/150?u=hannah',
        date: 'Oct 23, 2025',
        content: 'The code examples are super clear. Thanks for sharing!'
      },
      {
        id: 'c12',
        authorId: 'u-ivan',
        author: 'Ivan Chen',
        avatar: 'https://i.pravatar.cc/150?u=ivan',
        date: 'Oct 24, 2025',
        content: 'Been using this structure for 2 years now. Highly recommend it.'
      },
      {
        id: 'c13',
        authorId: 'u-julia',
        author: 'Julia Martinez',
        avatar: 'https://i.pravatar.cc/150?u=julia',
        date: 'Oct 24, 2025',
        content: 'What about error handling? Any best practices to share?'
      },
      {
        id: 'c14',
        authorId: 'u-kevin',
        author: 'Kevin Brown',
        avatar: 'https://i.pravatar.cc/150?u=kevin',
        date: 'Oct 25, 2025',
        content: 'Go is the best language for backend development. Fight me! 😄'
      }
    ]
  },
  {
    id: '3',
    title: 'Minimalism in Modern UI',
    excerpt: 'Why less is more: A deep dive into the principles of minimalist design and how to apply them effectively.',
    likes: 58,
    content: `
Minimalism is often misunderstood as simply "removing things." In reality, it's about removing the *unnecessary* to highlight the *essential*. It's a deliberate choice to focus the user's attention on what truly matters.

### Whitespace is Active

Whitespace (or negative space) is not empty space; it's an active design element. It creates breathing room, defines relationships between elements, and improves readability. Mastering the use of whitespace is the hallmark of a mature designer.
    `,
    date: 'Oct 12, 2025',
    category: 'Design',
    slug: 'minimalism-modern-ui',
    readTime: 4,
    tags: ['UI Design', 'Minimalism', 'Typography'],
    author: {
      name: 'Alex Kim',
      avatar: 'https://i.pravatar.cc/150?u=alex',
      handle: '@alex',
    },
    comments: []
  },
  {
    id: '4',
    title: 'From React to Reality',
    excerpt: 'A case study on how we transformed a complex React prototype into a production-ready application.',
    likes: 29,
    content: `
Prototypes are great for validation, but turning them into production code is a different beast. In this case study, we'll walk through the challenges we faced when scaling a React prototype to serve millions of users.

### State Management Nightmares

What worked for a demo quickly fell apart at scale. We had to refactor our state management strategy, moving from prop drilling to a more robust solution using Context and custom hooks, and eventually integrating a server-state library.

\`\`\`tsx
const UserProfile = () => {
  const { data, isLoading } = useQuery(['user'], fetchUser);

  if (isLoading) return <Spinner />;
  
  return <div>Hello, {data.name}</div>;
};
\`\`\`
    `,
    date: 'Sep 28, 2025',
    category: 'Tech',
    slug: 'react-to-reality',
    readTime: 6,
    tags: ['React', 'Frontend', 'Case Study'],
    author: {
      name: 'David Lee',
      avatar: 'https://i.pravatar.cc/150?u=david',
      handle: '@david',
    },
    comments: []
  },
  {
    id: '5',
    title: 'Creative Process: Behind the Scenes',
    excerpt: 'An inside look at our creative workflow, from initial brainstorming sessions to the final polish.',
    likes: 15,
    content: `
Creativity isn't magic; it's a process. At our studio, we believe in a structured approach to chaos. We start wide, exploring every possible angle, before narrowing down to the most potent ideas.
    `,
    date: 'Sep 15, 2025',
    category: 'Culture',
    slug: 'creative-process',
    readTime: 3,
    tags: ['Workflow', 'Creativity', 'Team'],
    author: {
      name: 'Emma Wilson',
      avatar: 'https://i.pravatar.cc/150?u=emma',
      handle: '@emma',
    },
    comments: []
  },
  {
    id: '6',
    title: 'Understanding Color Theory',
    excerpt: 'How to use color psychology to influence user behavior and create emotional connections.',
    likes: 61,
    content: `
    Color is one of the most powerful tools in a designer's arsenal. It can evoke emotion, guide action, and create a lasting brand impression. But using it effectively requires more than just a good eye; it requires an understanding of the science behind it.
    `,
    date: 'Sep 02, 2025',
    category: 'Design',
    slug: 'understanding-color-theory',
    readTime: 7,
    tags: ['Color Theory', 'Psychology', 'Branding'],
    author: {
      name: 'James Bond',
      avatar: 'https://i.pravatar.cc/150?u=james',
      handle: '@james',
    },
    comments: []
  },
  {
    id: '7',
    title: 'The Art of Typography',
    excerpt: 'Typography is not just about choosing a font; it\'s about creating a hierarchy and guiding the reader\'s eye.',
    likes: 89,
    content: `Typography is the voice of your design. It speaks volumes before the user even reads a single word.`,
    date: 'Aug 28, 2025',
    category: 'Design',
    slug: 'art-of-typography',
    readTime: 5,
    tags: ['Typography', 'Design', 'UI'],
    author: {
      name: 'Sarah Chen',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      handle: '@sarah',
    },
    comments: []
  },
  {
    id: '8',
    title: 'Mastering CSS Grid',
    excerpt: 'A comprehensive guide to CSS Grid Layout, from the basics to advanced techniques for complex layouts.',
    likes: 120,
    content: `CSS Grid has revolutionized the way we build web layouts. It allows us to create complex, responsive designs with ease.`,
    date: 'Aug 20, 2025',
    category: 'Tech',
    slug: 'mastering-css-grid',
    readTime: 10,
    tags: ['CSS', 'Frontend', 'Web Design'],
    author: {
      name: 'Mike Ross',
      avatar: 'https://i.pravatar.cc/150?u=mike',
      handle: '@mike',
    },
    comments: []
  },
  {
    id: '9',
    title: 'The Power of Storytelling',
    excerpt: 'How to use storytelling to connect with your audience and build a brand that resonates.',
    likes: 65,
    content: `Storytelling is a fundamental human experience. It's how we make sense of the world and connect with one another.`,
    date: 'Aug 15, 2025',
    category: 'Culture',
    slug: 'power-of-storytelling',
    readTime: 6,
    tags: ['Storytelling', 'Branding', 'Marketing'],
    author: {
      name: 'Emma Wilson',
      avatar: 'https://i.pravatar.cc/150?u=emma',
      handle: '@emma',
    },
    comments: []
  },
  {
    id: '10',
    title: 'Remote Work: The New Normal',
    excerpt: 'Navigating the challenges and opportunities of remote work in a post-pandemic world.',
    likes: 45,
    content: `Remote work is here to stay. But how do we maintain culture and collaboration when we're miles apart?`,
    date: 'Aug 10, 2025',
    category: 'Culture',
    slug: 'remote-work-new-normal',
    readTime: 4,
    tags: ['Remote Work', 'Culture', 'Productivity'],
    author: {
      name: 'David Lee',
      avatar: 'https://i.pravatar.cc/150?u=david',
      handle: '@david',
    },
    comments: []
  }
]
