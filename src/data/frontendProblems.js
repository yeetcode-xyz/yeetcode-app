// Frontend Learn UI Problems Database
export const frontendProblems = [
  {
    id: 1,
    title: 'Center a Div',
    difficulty: 'Easy',
    category: 'CSS',
    description: `
# Center a Div

The classic interview question! Create a perfectly centered div using CSS Flexbox.

## Requirements
- The div should be centered both horizontally and vertically
- The div should have a width of 200px and height of 200px
- Use a blue background color (#3b82f6)
- Add rounded corners (border-radius: 12px)
- Add text inside that says "Centered!" in white color

## Expected Output
A blue rounded box centered in the middle of the screen with white text.
    `,
    starterCode: {
      html: `<div class="container">
  <div class="box">
    Centered!
  </div>
</div>`,
      css: `/* Add your CSS here */
.container {
  /* Your code here */
}

.box {
  /* Your code here */
}`,
      js: ``,
    },
    solution: {
      html: `<div class="container">
  <div class="box">
    Centered!
  </div>
</div>`,
      css: `.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.box {
  width: 200px;
  height: 200px;
  background-color: #3b82f6;
  border-radius: 12px;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
}`,
      js: ``,
    },
    hints: [
      'Use display: flex on the container',
      'justify-content and align-items can help center items',
      'Make sure the container has a height (100vh is perfect)',
    ],
  },
  {
    id: 2,
    title: 'Interactive Counter',
    difficulty: 'Easy',
    category: 'JavaScript',
    description: `
# Interactive Counter

Build a simple counter with increment and decrement buttons.

## Requirements
- Display a counter starting at 0
- Add a "+" button that increments the counter
- Add a "-" button that decrements the counter
- Style the buttons with the YeetCode theme (black borders, 3D effect)
- The counter should not go below 0

## Expected Output
A centered counter display with two styled buttons that update the number.
    `,
    starterCode: {
      html: `<div class="counter-container">
  <button id="decrement">-</button>
  <span id="count">0</span>
  <button id="increment">+</button>
</div>`,
      css: `.counter-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 2rem;
}

button {
  padding: 0.5rem 1.5rem;
  font-size: 2rem;
  font-weight: bold;
  /* Add your styles here */
}`,
      js: `// Add your JavaScript here
const count = document.getElementById('count');
const increment = document.getElementById('increment');
const decrement = document.getElementById('decrement');

// Your code here`,
    },
    solution: {
      html: `<div class="counter-container">
  <button id="decrement">-</button>
  <span id="count">0</span>
  <button id="increment">+</button>
</div>`,
      css: `.counter-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 2rem;
  font-family: system-ui;
}

button {
  padding: 0.5rem 1.5rem;
  font-size: 2rem;
  font-weight: bold;
  background: white;
  border: 3px solid black;
  border-radius: 0.5rem;
  cursor: pointer;
  box-shadow: 4px 4px 0 black;
  transition: all 0.1s;
}

button:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 black;
}

#count {
  min-width: 60px;
  text-align: center;
  font-weight: bold;
}`,
      js: `const count = document.getElementById('count');
const increment = document.getElementById('increment');
const decrement = document.getElementById('decrement');

let currentCount = 0;

increment.addEventListener('click', () => {
  currentCount++;
  count.textContent = currentCount;
});

decrement.addEventListener('click', () => {
  if (currentCount > 0) {
    currentCount--;
    count.textContent = currentCount;
  }
});`,
    },
    hints: [
      'Use addEventListener to handle button clicks',
      'Store the current count in a variable',
      'Update the textContent of the count element',
    ],
  },
  {
    id: 3,
    title: 'Gradient Card',
    difficulty: 'Easy',
    category: 'CSS',
    description: `
# Gradient Card

Create a modern card with a gradient background and hover effects.

## Requirements
- Create a card with padding and rounded corners
- Use a linear gradient from purple (#8b5cf6) to pink (#ec4899)
- Add a smooth box-shadow
- On hover, the card should slightly scale up (transform: scale(1.05))
- Add smooth transitions for the hover effect
- Include a title and description text in white

## Expected Output
A beautiful gradient card that smoothly scales on hover.
    `,
    starterCode: {
      html: `<div class="card">
  <h2>Gradient Card</h2>
  <p>Hover over me to see the magic!</p>
</div>`,
      css: `body {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f3f4f6;
}

.card {
  /* Add your styles here */
}

.card h2 {
  /* Style the heading */
}

.card p {
  /* Style the paragraph */
}`,
      js: ``,
    },
    solution: {
      html: `<div class="card">
  <h2>Gradient Card</h2>
  <p>Hover over me to see the magic!</p>
</div>`,
      css: `body {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f3f4f6;
  font-family: system-ui;
}

.card {
  padding: 2rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  max-width: 300px;
}

.card:hover {
  transform: scale(1.05);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

.card h2 {
  margin: 0 0 0.5rem 0;
  color: white;
  font-size: 1.5rem;
}

.card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}`,
      js: ``,
    },
    hints: [
      'Use linear-gradient() for the background',
      'Add transition property for smooth animations',
      'Use transform: scale() on hover',
    ],
  },
  {
    id: 4,
    title: 'Todo List',
    difficulty: 'Medium',
    category: 'JavaScript',
    description: `
# Todo List

Build a functional todo list with add and delete capabilities.

## Requirements
- Input field to add new todos
- "Add" button to submit
- Display list of todos below
- Each todo should have a delete button (×)
- Pressing Enter in the input should also add the todo
- Clear the input after adding
- If input is empty, don't add a todo

## Expected Output
A functional todo list where you can add and remove items.
    `,
    starterCode: {
      html: `<div class="todo-app">
  <h1>📝 Todo List</h1>
  <div class="input-container">
    <input type="text" id="todoInput" placeholder="What needs to be done?">
    <button id="addBtn">Add</button>
  </div>
  <ul id="todoList"></ul>
</div>`,
      css: `body {
  font-family: system-ui;
  background: #fef3c7;
  padding: 2rem;
}

.todo-app {
  max-width: 500px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border: 4px solid black;
  border-radius: 1rem;
}

h1 {
  margin-top: 0;
}

.input-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid black;
  border-radius: 0.5rem;
  font-size: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: 2px solid black;
  border-radius: 0.5rem;
  font-weight: bold;
  cursor: pointer;
}

#todoList {
  list-style: none;
  padding: 0;
}

/* Add styles for todo items */`,
      js: `// Add your JavaScript here
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');

// Your code here`,
    },
    solution: {
      html: `<div class="todo-app">
  <h1>📝 Todo List</h1>
  <div class="input-container">
    <input type="text" id="todoInput" placeholder="What needs to be done?">
    <button id="addBtn">Add</button>
  </div>
  <ul id="todoList"></ul>
</div>`,
      css: `body {
  font-family: system-ui;
  background: #fef3c7;
  padding: 2rem;
}

.todo-app {
  max-width: 500px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border: 4px solid black;
  border-radius: 1rem;
}

h1 {
  margin-top: 0;
}

.input-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid black;
  border-radius: 0.5rem;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
}

button {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: 2px solid black;
  border-radius: 0.5rem;
  font-weight: bold;
  cursor: pointer;
}

button:hover {
  background: #2563eb;
}

#todoList {
  list-style: none;
  padding: 0;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f3f4f6;
  border: 2px solid black;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.delete-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: bold;
}

.delete-btn:hover {
  background: #dc2626;
}`,
      js: `const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');

function addTodo() {
  const todoText = todoInput.value.trim();

  if (todoText === '') return;

  const li = document.createElement('li');
  li.className = 'todo-item';
  li.innerHTML = \`
    <span>\${todoText}</span>
    <button class="delete-btn">×</button>
  \`;

  li.querySelector('.delete-btn').addEventListener('click', () => {
    li.remove();
  });

  todoList.appendChild(li);
  todoInput.value = '';
  todoInput.focus();
}

addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTodo();
  }
});`,
    },
    hints: [
      'Use createElement to create new list items',
      'Add event listeners for both button click and Enter key',
      'Use remove() to delete elements',
    ],
  },
  {
    id: 5,
    title: 'Responsive Navbar',
    difficulty: 'Medium',
    category: 'CSS',
    description: `
# Responsive Navbar

Create a responsive navigation bar that works on mobile and desktop.

## Requirements
- Navigation bar with logo and menu items
- On desktop: horizontal layout
- On mobile (< 768px): hamburger menu
- Use Flexbox for layout
- Add smooth transitions
- Black borders and YeetCode styling

## Expected Output
A professional navbar that adapts to screen size.
    `,
    starterCode: {
      html: `<nav class="navbar">
  <div class="logo">YeetCode</div>
  <ul class="nav-menu">
    <li><a href="#home">Home</a></li>
    <li><a href="#learn">Learn</a></li>
    <li><a href="#leaderboard">Leaderboard</a></li>
    <li><a href="#profile">Profile</a></li>
  </ul>
  <button class="hamburger">☰</button>
</nav>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui;
}

.navbar {
  /* Add your styles here */
}

.logo {
  /* Style the logo */
}

.nav-menu {
  /* Style the menu */
}

.nav-menu li {
  list-style: none;
}

.nav-menu a {
  text-decoration: none;
  color: black;
}

.hamburger {
  /* Style the hamburger button */
  display: none; /* Hide on desktop */
}

/* Mobile styles */
@media (max-width: 768px) {
  /* Add mobile styles here */
}`,
      js: ``,
    },
    solution: {
      html: `<nav class="navbar">
  <div class="logo">YeetCode</div>
  <ul class="nav-menu">
    <li><a href="#home">Home</a></li>
    <li><a href="#learn">Learn</a></li>
    <li><a href="#leaderboard">Leaderboard</a></li>
    <li><a href="#profile">Profile</a></li>
  </ul>
  <button class="hamburger">☰</button>
</nav>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #fef3c7;
  border-bottom: 4px solid black;
}

.logo {
  font-weight: bold;
  font-size: 1.5rem;
}

.nav-menu {
  display: flex;
  gap: 2rem;
  list-style: none;
}

.nav-menu a {
  text-decoration: none;
  color: black;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.nav-menu a:hover {
  background: white;
}

.hamburger {
  display: none;
  font-size: 1.5rem;
  background: none;
  border: 2px solid black;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

@media (max-width: 768px) {
  .hamburger {
    display: block;
  }

  .nav-menu {
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: #fef3c7;
    border-bottom: 4px solid black;
    padding: 1rem;
    display: none;
  }

  .nav-menu.active {
    display: flex;
  }
}`,
      js: `const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});`,
    },
    hints: [
      'Use @media queries for responsive design',
      'Toggle a class with JavaScript for the mobile menu',
      'Use position: absolute for the mobile menu',
    ],
  },
];

// Helper function to get problem by ID
export const getProblemById = id => {
  return frontendProblems.find(p => p.id === id);
};

// Get problems by difficulty
export const getProblemsByDifficulty = difficulty => {
  return frontendProblems.filter(p => p.difficulty === difficulty);
};

// Get problems by category
export const getProblemsByCategory = category => {
  return frontendProblems.filter(p => p.category === category);
};
