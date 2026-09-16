
# def test_a1():
#     pass

# def test_a2():
#     pass

def test_a3():
    hello="hello"
    assert "e" in hello

class TestMyTests:
    def test_type(self):
        assert type(1) == int

    # def test_first_test(self):
    #     assert 1 == 0

    # def test_second_test(self):
    #     pass
    

#test discovery

# with is a way to simplify the management of resources like file streams. 
# It automatically handles opening and closing files, ensuring that resources are properly released after use. 

#Use with when Python needs to manage a temporary context around some code.

''''
files:
test_*.py
*_test.py


functions:
def test_*()

class:
class Test*:
'''


# source .venv/bin/activate
# pytest test/test_module01.py -v    

#reached 50+50