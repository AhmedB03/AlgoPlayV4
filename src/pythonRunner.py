import json, sys, copy, math

def run_submission(payload):
    code, problem = payload['code'], payload['problem']
    steps, results = [], []
    class ListNode:
        def __init__(self, val=0, next=None):
            self.val, self.next = val, next
    nodes = {}
    def node_id(value):
        if not isinstance(value, ListNode): return None
        if id(value) in nodes: return nodes[id(value)][0]
        if len(nodes) >= 30: return None
        key = 'n' + str(len(nodes))
        nodes[id(value)] = (key, value)
        node_id(value.next)
        return key
    def snap(v, depth=0, seen=None):
        seen = set() if seen is None else seen
        if isinstance(v, float) and not math.isfinite(v): return str(v)
        if v is None or isinstance(v, (bool, int, float)): return v
        if isinstance(v, str): return v[:200]
        if depth > 3: return '…'
        if id(v) in seen: return '[reference/cycle]'
        seen.add(id(v))
        if isinstance(v, (list, tuple, set)): return [snap(x, depth+1, seen) for x in list(v)[:30]]
        if isinstance(v, dict): return {str(k): snap(x, depth+1, seen) for k,x in list(v.items())[:30]}
        if isinstance(v, ListNode): return {'val': snap(v.val, depth+1, seen), 'next': snap(v.next, depth+1, seen)}
        return type(v).__name__
    def trace(frame, event, arg):
        if frame.f_code.co_filename == '<solution>' and event in ('line', 'return', 'exception') and len(steps) < 500:
            local = {k:snap(v) for k,v in list(frame.f_locals.items())[:30] if not k.startswith('__') and not callable(v)}
            if event == 'return': local['return'] = snap(arg)
            refs = {k:node_id(v) for k,v in list(frame.f_locals.items())[:30] if v is None or isinstance(v, ListNode)}
            if event == 'return' and isinstance(arg, ListNode): refs['return'] = node_id(arg)
            heap = [{'id': key, 'value': snap(v.val), 'next': node_id(v.next)} for key,v in list(nodes.values())]
            steps.append({'line': frame.f_lineno, 'event': event, 'locals': local, 'heap': heap, 'refs': refs})
        return trace
    compiled = compile(code, '<solution>', 'exec')
    for index, test in enumerate(problem['tests']):
        row = {'label':test['label'], 'input':json.dumps(test['args']), 'expected':json.dumps(test['expected']), 'passed':False, 'actual':'Error'}
        try:
            namespace = {'ListNode': ListNode}
            if index == 0: sys.settrace(trace)
            exec(compiled, namespace)
            args = copy.deepcopy(test['args'])
            if problem['id'] == 'reverse-list':
                head = None
                for val in reversed(args[0]): head = ListNode(val, head)
                args[0] = head
            answer = namespace[problem['functionName']](*args)
            if problem['id'] == 'reverse-list':
                values, seen = [], set()
                while answer is not None:
                    if not isinstance(answer, ListNode): raise ValueError('Return a ListNode head or None, not an array.')
                    if id(answer) in seen: raise ValueError('The returned linked list contains a cycle.')
                    seen.add(id(answer)); values.append(answer.val); answer = answer.next
                    if len(values) > 10000: raise ValueError('Returned list is too long.')
                answer = values
            row['actual'] = json.dumps(answer)
            row['passed'] = answer == test['expected'] and type(answer) == type(test['expected'])
            if problem['id'] == 'two-sum':
                nums, target = test['args']
                row['passed'] = isinstance(answer, list) and len(answer) == 2 and all(type(i) is int and 0 <= i < len(nums) for i in answer) and answer[0] != answer[1] and nums[answer[0]] + nums[answer[1]] == target
        except Exception as error:
            row['error'] = f'{type(error).__name__}: {error}'
        finally: sys.settrace(None)
        results.append(row)
    return {'results':results, 'steps':steps}

json.dumps(run_submission(json.loads(payload_json)))
