import { QuizApp } from './examples/quiz-app/src/index.tsx';

const quiz = new QuizApp();
const layoutNode = quiz.getLayoutNode();

// Let's inspect the layoutNode children
console.log("LayoutNode Children ids in order:");
layoutNode.children.forEach((child, index) => {
    console.log(`Index ${index}: id=${child.id}, visible=${child.style.visible}, height=${child.style.height}`);
});
