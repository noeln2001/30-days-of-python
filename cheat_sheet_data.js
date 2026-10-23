window.CHEAT_SHEET_DATA = [
  {
    category: "Built-in Functions",
    icon: "⚙️",
    items: [
      {
        name: "print(*objects, sep=' ', end='\\n')",
        description: "Prints objects to the text stream (console), separated by sep and followed by end.",
        example: "print('Python', 'Rocks', sep=' - ', end='!\\n')\n# Output: Python - Rocks!"
      },
      {
        name: "len(s)",
        description: "Returns the number of items in an object (string, list, tuple, dictionary, set, etc.).",
        example: "languages = ['Python', 'Rust', 'Go']\nprint(len(languages))\n# Output: 3"
      },
      {
        name: "type(object)",
        description: "Returns the type of an object (e.g. <class 'int'>, <class 'str'>).",
        example: "print(type(42))\n# Output: <class 'int'>"
      },
      {
        name: "range(start, stop[, step])",
        description: "Generates an immutable sequence of numbers from start (inclusive) to stop (exclusive).",
        example: "evens = list(range(0, 10, 2))\nprint(evens)\n# Output: [0, 2, 4, 6, 8]"
      },
      {
        name: "enumerate(iterable, start=0)",
        description: "Returns an enumerate object producing pairs of (index, item).",
        example: "fruits = ['apple', 'banana', 'cherry']\nfor idx, fruit in enumerate(fruits, 1):\n    print(f'{idx}: {fruit}')\n# Output:\n# 1: apple\n# 2: banana\n# 3: cherry"
      },
      {
        name: "zip(*iterables)",
        description: "Aggregates elements from each of the iterables in parallel tuples.",
        example: "names = ['Alice', 'Bob']\nscores = [95, 88]\ncombined = dict(zip(names, scores))\nprint(combined)\n# Output: {'Alice': 95, 'Bob': 88}"
      },
      {
        name: "sorted(iterable, key=None, reverse=False)",
        description: "Returns a new sorted list from the items in iterable.",
        example: "words = ['banana', 'pie', 'apple']\nprint(sorted(words, key=len))\n# Output: ['pie', 'apple', 'banana']"
      },
      {
        name: "min() / max() / sum()",
        description: "Calculates the smallest, largest, or total sum of iterable numbers.",
        example: "nums = [15, 3, 42, 8]\nprint('Min:', min(nums), 'Max:', max(nums), 'Sum:', sum(nums))\n# Output: Min: 3 Max: 42 Sum: 68"
      }
    ]
  },
  {
    category: "Strings & Methods",
    icon: "🔤",
    items: [
      {
        name: "f-strings (Formatted String Literals)",
        description: "Formatted string literals evaluated at runtime using curly braces {expression}.",
        example: "name = 'Ada'\nage = 28\nprint(f'{name} is {age} years old and will be {age + 1} next year.')\n# Output: Ada is 28 years old and will be 29 next year."
      },
      {
        name: "str.split(sep=None, maxsplit=-1)",
        description: "Splits a string into a list of words using sep as the delimiter.",
        example: "tags = 'python,data,ai,web'\nprint(tags.split(','))\n# Output: ['python', 'data', 'ai', 'web']"
      },
      {
        name: "str.join(iterable)",
        description: "Joins iterable elements with the string as separator.",
        example: "words = ['30', 'Days', 'Of', 'Python']\nprint(' '.join(words))\n# Output: 30 Days Of Python"
      },
      {
        name: "str.strip([chars])",
        description: "Removes leading and trailing whitespace or specified characters.",
        example: "raw = '   clean me \\n'\nprint(repr(raw.strip()))\n# Output: 'clean me'"
      },
      {
        name: "str.replace(old, new[, count])",
        description: "Returns a copy with occurrences of substring old replaced by new.",
        example: "greeting = 'Hello Java'\nprint(greeting.replace('Java', 'Python'))\n# Output: Hello Python"
      },
      {
        name: "String Slicing [start:stop:step]",
        description: "Extracts sub-strings using index boundaries and step increments.",
        example: "text = 'Python'\nprint(text[0:3])    # 'Pyt'\nprint(text[-3:])   # 'hon'\nprint(text[::-1])  # 'nohtyP' (reversed)"
      }
    ]
  },
  {
    category: "Lists & Arrays",
    icon: "📋",
    items: [
      {
        name: "list.append(x) vs list.extend(iterable)",
        description: "append adds a single item to the end; extend iterates through iterable adding each element.",
        example: "lst = [1, 2]\nlst.append(3)\nlst.extend([4, 5])\nprint(lst)\n# Output: [1, 2, 3, 4, 5]"
      },
      {
        name: "list.pop([index])",
        description: "Removes and returns the item at index (default is last item).",
        example: "stack = ['a', 'b', 'c']\nlast = stack.pop()\nprint('Popped:', last, 'Remaining:', stack)\n# Output: Popped: c Remaining: ['a', 'b']"
      },
      {
        name: "list.sort(key=None, reverse=False)",
        description: "Sorts the list in place (modifies original list, returns None).",
        example: "nums = [5, 2, 9, 1]\nnums.sort()\nprint(nums)\n# Output: [1, 2, 5, 9]"
      },
      {
        name: "List Unpacking",
        description: "Unpack list items into variables with optional *rest syntax.",
        example: "first, second, *rest = [1, 2, 3, 4, 5]\nprint('First:', first, 'Second:', second, 'Rest:', rest)\n# Output: First: 1 Second: 2 Rest: [3, 4, 5]"
      }
    ]
  },
  {
    category: "Dictionaries",
    icon: "📖",
    items: [
      {
        name: "dict.get(key, default=None)",
        description: "Safely returns the value for key if key is in dictionary, else default (never raises KeyError).",
        example: "user = {'username': 'coder101'}\nprint(user.get('email', 'not_provided@test.com'))\n# Output: not_provided@test.com"
      },
      {
        name: "dict.items() / keys() / values()",
        description: "Returns dynamic view objects of dictionary pairs, keys, or values.",
        example: "scores = {'math': 90, 'physics': 85}\nfor subject, score in scores.items():\n    print(f'{subject}: {score}')\n# Output:\n# math: 90\n# physics: 85"
      },
      {
        name: "dict.update([other])",
        description: "Updates dictionary with elements from another dictionary or iterable of key/value pairs.",
        example: "profile = {'name': 'Sam'}\nprofile.update({'role': 'Engineer', 'level': 'Senior'})\nprint(profile)\n# Output: {'name': 'Sam', 'role': 'Engineer', 'level': 'Senior'}"
      }
    ]
  },
  {
    category: "Sets & Math Sets",
    icon: "⭕",
    items: [
      {
        name: "Set Operations: |, &, -, ^",
        description: "| = Union, & = Intersection, - = Difference, ^ = Symmetric Difference.",
        example: "A = {1, 2, 3, 4}\nB = {3, 4, 5, 6}\nprint('Union:', A | B)           # {1, 2, 3, 4, 5, 6}\nprint('Intersection:', A & B)    # {3, 4}\nprint('Difference (A - B):', A - B) # {1, 2}\nprint('Sym Diff:', A ^ B)        # {1, 2, 5, 6}"
      },
      {
        name: "set.add(elem) vs set.discard(elem)",
        description: "add inserts an element. discard safely removes an element without error if not found.",
        example: "s = {'apple', 'banana'}\ns.add('orange')\ns.discard('grape')  # No KeyError!\nprint(s)"
      }
    ]
  },
  {
    category: "Comprehensions",
    icon: "⚡",
    items: [
      {
        name: "List Comprehension [expr for x in iterable if cond]",
        description: "Concise syntax for creating new lists based on existing iterables.",
        example: "squares = [x**2 for x in range(10) if x % 2 == 0]\nprint(squares)\n# Output: [0, 4, 16, 36, 64]"
      },
      {
        name: "Dictionary Comprehension {k: v for x in iterable}",
        description: "Concise syntax for building new dictionaries.",
        example: "words = ['cat', 'elephant', 'tiger']\nword_lengths = {w: len(w) for w in words}\nprint(word_lengths)\n# Output: {'cat': 3, 'elephant': 8, 'tiger': 5}"
      }
    ]
  },
  {
    category: "Error Handling & Debugging",
    icon: "🛡️",
    items: [
      {
        name: "try ... except ... else ... finally",
        description: "Structure for graceful exception handling and guaranteed resource cleanup.",
        example: "try:\n    result = 10 / 2\nexcept ZeroDivisionError:\n    print('Division error!')\nelse:\n    print('Success:', result)\nfinally:\n    print('Cleanup executed!')\n# Output:\n# Success: 5.0\n# Cleanup executed!"
      },
      {
        name: "raise Exception('message')",
        description: "Explicitly raises an exception with custom error details.",
        example: "def validate_age(age):\n    if age < 0:\n        raise ValueError('Age cannot be negative!')\n    return f'Valid age: {age}'\nprint(validate_age(20))"
      }
    ]
  },
  {
    category: "Regular Expressions (re)",
    icon: "🔍",
    items: [
      {
        name: "re.findall(pattern, string, flags=0)",
        description: "Returns all non-overlapping matches of pattern in string as a list of strings.",
        example: "import re\ntext = 'User123 logged in from 192.168.1.1 at 2026'\nnumbers = re.findall(r'\\d+', text)\nprint(numbers)\n# Output: ['123', '192', '168', '1', '1', '2026']"
      },
      {
        name: "re.sub(pattern, repl, string, count=0)",
        description: "Replaces occurrences of pattern in string with repl.",
        example: "import re\ntext = 'Contact: test@gmail.com or dev@yahoo.com'\nmasked = re.sub(r'[\\w\\.-]+@[\\w\\.-]+', '[HIDDEN EMAIL]', text)\nprint(masked)\n# Output: Contact: [HIDDEN EMAIL] or [HIDDEN EMAIL]"
      }
    ]
  }
];
