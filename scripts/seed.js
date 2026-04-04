// MongoDB seed data script
// Seeds sample users, problems, and contests for development

const path = require('path');
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const bcrypt = require(path.join(__dirname, '../backend/node_modules/bcrypt'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

// Import models
const User = require('../backend/src/modules/auth/model');
const Problem = require('../backend/src/modules/problems/model');
const { Contest } = require('../backend/src/modules/contests/model');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Problem.deleteMany({});
    await Contest.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create users
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const admin = await User.create({
      username: 'admin',
      email: 'admin@codecourt.com',
      passwordHash: hashedPassword,
      role: 'admin'
    });

    const problemSetter = await User.create({
      username: 'problemsetter',
      email: 'setter@codecourt.com',
      passwordHash: hashedPassword,
      role: 'problem_setter'
    });

    const contestant = await User.create({
      username: 'contestant',
      email: 'contestant@codecourt.com',
      passwordHash: hashedPassword,
      role: 'contestant'
    });

    console.log('✓ Created 3 users (admin, problemsetter, contestant)');

    // Create 10 problems
    console.log('Creating problems...');
    const problems = [];
    
    const problemData = [
      {
        title: 'Two Sum',
        slug: 'two-sum',
        description: '# Two Sum\n\nGiven an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\n## Constraints\n- 2 ≤ nums.length ≤ 10⁴\n- -10⁹ ≤ nums[i] ≤ 10⁹\n- -10⁹ ≤ target ≤ 10⁹\n- Only one valid answer exists.',
        constraints: '2 ≤ nums.length ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹\n-10⁹ ≤ target ≤ 10⁹',
        difficulty: 'easy',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: '[2,7,11,15]\n9', output: '[0,1]' },
          { input: '[3,2,4]\n6', output: '[1,2]' }
        ]
      },
      {
        title: 'Reverse String',
        slug: 'reverse-string',
        description: '# Reverse String\n\nWrite a function that reverses a string. The input string is given as an array of characters.\n\n## Constraints\n- 1 ≤ s.length ≤ 10⁵\n- s[i] is a printable ascii character.',
        constraints: '1 ≤ s.length ≤ 10⁵\ns[i] is a printable ascii character',
        difficulty: 'easy',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: '["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
          { input: '["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' }
        ]
      },
      {
        title: 'Valid Parentheses',
        slug: 'valid-parentheses',
        description: '# Valid Parentheses\n\nGiven a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\n## Constraints\n- 1 ≤ s.length ≤ 10⁴\n- s consists of parentheses only `()[]{}`.',
        constraints: '1 ≤ s.length ≤ 10⁴\ns consists of parentheses only ()[]{} ',
        difficulty: 'easy',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: '()', output: 'true' },
          { input: '()[]{}', output: 'true' },
          { input: '(]', output: 'false' }
        ]
      },
      {
        title: 'Merge Two Sorted Lists',
        slug: 'merge-two-sorted-lists',
        description: '# Merge Two Sorted Lists\n\nMerge two sorted linked lists and return it as a sorted list.\n\n## Constraints\n- The number of nodes in both lists is in the range [0, 50].\n- -100 ≤ Node.val ≤ 100\n- Both lists are sorted in non-decreasing order.',
        constraints: 'Number of nodes in [0, 50]\n-100 ≤ Node.val ≤ 100\nBoth lists sorted in non-decreasing order',
        difficulty: 'easy',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: '[1,2,4]\n[1,3,4]', output: '[1,1,2,3,4,4]' },
          { input: '[]\n[]', output: '[]' }
        ]
      },
      {
        title: 'Binary Search',
        slug: 'binary-search',
        description: '# Binary Search\n\nGiven a sorted array of integers `nums` and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return -1.\n\n## Constraints\n- 1 ≤ nums.length ≤ 10⁴\n- -10⁴ < nums[i], target < 10⁴\n- All integers in nums are unique.\n- nums is sorted in ascending order.',
        constraints: '1 ≤ nums.length ≤ 10⁴\n-10⁴ < nums[i], target < 10⁴\nAll integers unique\nnums sorted ascending',
        difficulty: 'easy',
        timeLimit: 1000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: '[-1,0,3,5,9,12]\n9', output: '4' },
          { input: '[-1,0,3,5,9,12]\n2', output: '-1' }
        ]
      },
      {
        title: 'Longest Substring Without Repeating Characters',
        slug: 'longest-substring-without-repeating',
        description: '# Longest Substring Without Repeating Characters\n\nGiven a string `s`, find the length of the longest substring without repeating characters.\n\n## Constraints\n- 0 ≤ s.length ≤ 5 * 10⁴\n- s consists of English letters, digits, symbols and spaces.',
        constraints: '0 ≤ s.length ≤ 5 * 10⁴\ns consists of English letters, digits, symbols and spaces',
        difficulty: 'medium',
        timeLimit: 2000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: 'abcabcbb', output: '3' },
          { input: 'bbbbb', output: '1' },
          { input: 'pwwkew', output: '3' }
        ]
      },
      {
        title: 'Container With Most Water',
        slug: 'container-with-most-water',
        description: '# Container With Most Water\n\nGiven n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\n## Constraints\n- n == height.length\n- 1 ≤ n ≤ 2 * 10⁴\n- 0 ≤ height[i] ≤ 10⁵',
        constraints: 'n == height.length\n1 ≤ n ≤ 2 * 10⁴\n0 ≤ height[i] ≤ 10⁵',
        difficulty: 'medium',
        timeLimit: 2000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: '[1,8,6,2,5,4,8,3,7]', output: '49' },
          { input: '[1,1]', output: '1' }
        ]
      },
      {
        title: '3Sum',
        slug: '3sum',
        description: '# 3Sum\n\nGiven an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\n## Constraints\n- 3 ≤ nums.length ≤ 3000\n- -10⁵ ≤ nums[i] ≤ 10⁵',
        constraints: '3 ≤ nums.length ≤ 3000\n-10⁵ ≤ nums[i] ≤ 10⁵',
        difficulty: 'medium',
        timeLimit: 3000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: '[-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]' },
          { input: '[0,1,1]', output: '[]' }
        ]
      },
      {
        title: 'Median of Two Sorted Arrays',
        slug: 'median-of-two-sorted-arrays',
        description: '# Median of Two Sorted Arrays\n\nGiven two sorted arrays `nums1` and `nums2` of size m and n respectively, return the median of the two sorted arrays.\n\n## Constraints\n- nums1.length == m\n- nums2.length == n\n- 0 ≤ m ≤ 1000\n- 0 ≤ n ≤ 1000\n- 1 ≤ m + n ≤ 2000\n- -10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶',
        constraints: '0 ≤ m ≤ 1000\n0 ≤ n ≤ 1000\n1 ≤ m + n ≤ 2000\n-10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶',
        difficulty: 'hard',
        timeLimit: 3000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: '[1,3]\n[2]', output: '2.0' },
          { input: '[1,2]\n[3,4]', output: '2.5' }
        ]
      },
      {
        title: 'Regular Expression Matching',
        slug: 'regular-expression-matching',
        description: '# Regular Expression Matching\n\nGiven an input string `s` and a pattern `p`, implement regular expression matching with support for `.` and `*`.\n\n## Constraints\n- 1 ≤ s.length ≤ 20\n- 1 ≤ p.length ≤ 30\n- s contains only lowercase English letters.\n- p contains only lowercase English letters, `.`, and `*`.',
        constraints: '1 ≤ s.length ≤ 20\n1 ≤ p.length ≤ 30\ns: lowercase letters only\np: lowercase letters, ., * only',
        difficulty: 'hard',
        timeLimit: 3000,
        memoryLimit: 256,
        sampleTestCases: [
          { input: 'aa\na', output: 'false' },
          { input: 'aa\na*', output: 'true' },
          { input: 'ab\n.*', output: 'true' }
        ]
      }
    ];

    for (const data of problemData) {
      const problem = await Problem.create({
        ...data,
        status: 'published',
        authorId: problemSetter._id
      });
      problems.push(problem);
    }

    console.log('✓ Created 10 problems (3 easy, 4 medium, 3 hard)');

    // Create 1 contest
    console.log('Creating contest...');
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

    await Contest.create({
      title: 'CodeCourt Weekly Contest #1',
      description: 'Welcome to the first CodeCourt weekly contest! Test your skills with 5 carefully selected problems.',
      status: 'upcoming',
      startTime,
      endTime,
      problemIds: problems.slice(0, 5).map(p => p._id), // First 5 problems
      participants: [],
      createdBy: admin._id
    });

    console.log('✓ Created 1 contest (upcoming, starts tomorrow)');

    console.log('\n✓ Seed complete!');
    console.log('\nSample credentials:');
    console.log('  Admin:         admin@codecourt.com / password123');
    console.log('  Problem Setter: setter@codecourt.com / password123');
    console.log('  Contestant:    contestant@codecourt.com / password123');

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('✗ Seed error:', error);
    process.exit(1);
  }
}

seed();
