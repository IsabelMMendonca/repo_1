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

    int num{10};

    if (num > 10){
        ++num;
    }
    else {
        cout << "not greater than 10" << endl;
    }

    return 0;
}
