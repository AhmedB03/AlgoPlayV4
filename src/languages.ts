import type { Problem } from './problems';
export type Language = 'python' | 'javascript';
export const isLanguage = (v: unknown): v is Language => v === 'python' || v === 'javascript';
const params: Record<string, string> = { 'two-sum': 'nums, target', 'reverse-list': 'head', palindrome: 's', 'binary-search': 'nums, target', parentheses: 's', 'graph-bfs': 'graph, start' };
export const starter = (p: Problem, language: Language) => language === 'javascript' ? p.starter : `def ${p.functionName}(${params[p.id]}):\n    # Write your solution here.\n    pass\n`;
export const pythonSolutions: Record<string, string> = {
 'two-sum': 'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        need = target - num\n        if need in seen:\n            return [seen[need], i]\n        seen[num] = i\n    return []',
 'reverse-list': 'def reverseList(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev',
 palindrome: 'def isPalindrome(s):\n    text = "".join(c for c in s.lower() if c in "abcdefghijklmnopqrstuvwxyz0123456789")\n    left, right = 0, len(text) - 1\n    while left < right:\n        if text[left] != text[right]:\n            return False\n        left += 1\n        right -= 1\n    return True',
 'binary-search': 'def search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1',
 parentheses: 'def isValid(s):\n    stack = []\n    pairs = {")": "(", "]": "[", "}": "{"}\n    for char in s:\n        if char in "([{":\n            stack.append(char)\n        elif not stack or stack.pop() != pairs[char]:\n            return False\n    return not stack',
 'graph-bfs': 'def bfs(graph, start):\n    queue = [start]\n    seen = {start}\n    order = []\n    for node in queue:\n        order.append(node)\n        for neighbor in graph.get(node, []):\n            if neighbor not in seen:\n                seen.add(neighbor)\n                queue.append(neighbor)\n    return order',
};
