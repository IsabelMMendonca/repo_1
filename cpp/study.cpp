#include <iostream>
#include <vector>

using namespace std;
// clang++ -std=c++14 study.cpp -o study
//  ./study
int main()
{
    /*
        vector<int> vector_1;
        vector<int> vector_2;

        vector_1.push_back(10);
        vector_1.push_back(20);

        cout << vector_1.at(0) << endl;
        cout << vector_1.at(1) << endl;
        cout << vector_1.size() << endl;

        vector_2.push_back(100);
        vector_2.push_back(200);

        cout << "vector 2 at 0 " << vector_2.at(0) << " at 1 " << vector_2.at(1) << " sizing " << vector_2.size() << endl;

        vector<vector<int>> vector_2d;

        vector_2d.push_back(vector_1);
        vector_2d.push_back(vector_2);

        cout << "vector 2d at 0 " << vector_2d.at(0).at(0) << " at 1 " << vector_2d.at(0).at(1) << " sizing " << vector_2d.size() << endl;

        vector_1.at(0) = 1000;
        cout << "after adding 1k "<< " vector 2d at 0 0 " << vector_2d.at(0).at(0) << " at 0 1 " << vector_2d.at(0).at(1) << " sizing " << vector_2d.size() << endl;
        */

    // int num{10};

    // if (num > 10){
    //     ++num;
    // }
    // else {
    //     cout << "not greater than 10" << endl;
    // }

    // int score{};
    // cout << "Enter your score (0-100): ";
    // cin >> score;

    // char letter_grade{};
    // if (score >= 0 && score <= 100)
    // {
    //     if (score > 90)
    //     {
    //         letter_grade = 'A';
    //     }
    //     else if (score > 80)
    //     {
    //         letter_grade = 'B';
    //     }
    //     else if (score > 70)
    //     {
    //         letter_grade = 'C';
    //     }
    //     else if (score > 60)
    //     {
    //         letter_grade = 'D';
    //     }
    //     else
    //     {
    //         letter_grade = 'F';
    //     }
    //     cout << "Your  grade is: " << letter_grade << endl;
    // }
    // else
    // {
    //     cout << "Invalid score entered. Please enter a score between 0 and 100." << endl;
    // }

    // switch (score)
    // {
    // case 90 ... 100:
    //     letter_grade = 'A';
    //     break;
    // case 80 ... 89:         
    //     letter_grade = 'B';
    //     break;
    // case 70 ... 79:
    //     letter_grade = 'C';
    //     break;
    // case 60 ... 69:
    //     letter_grade = 'D';
    //     break;
    // case 0 ... 59:
    //     letter_grade = 'F';
    //     break;
    // default:
    //     cout << "Invalid score entered. Please enter a score between 0 and 100." << endl;
    //     return 1; // Exit with an error code
    // }
    // cout << "Your grade is: " << letter_grade << endl;
    // cout << endl;

    enum Direction{ left,right,up,down};
    Direction heading{left};

    switch (heading){
    case left:
        cout << "Heading left" << endl;
        break;
    case right:
        cout << "Heading right" << endl;
        break;
    default:
        cout << "Not left or right" << endl;

    }
    return 0;
}
