
# def test_a1():
#     pass

# def test_a2():
#     pass
from first import contains_letter

def test_contains_letter():
    assert contains_letter("papaya", "a")

def test_contains_wrong_letter():
    assert not contains_letter("papaya", "e")

def test_calculate_orders(items, customer_type, coupon=None):
    items=[
        {"price": 3.1, "quantity": 100},
        {"price": 5.99, "quantity": 30},
        {"price": 10.50, "quantity": 45},
    ]

    result = calculate_orders(items, customer_type = "regular")

# class TestMyTests:
#     def test_type(self):
#         assert type(1) == int

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