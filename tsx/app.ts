//compiler tsc app.ts; node app.js
function logger <T extends new (...args: any[]) =>any>(
    target: T,
    ctx:ClassDecoratorContext
)
{
 //   console.log('======= logger here ========\n', target, ctx);

    return class extends target {
        constructor(...args:any[]){
            super(...args);
            // console.log('=========class constructor===========\n', this)
        }
    }
}

function autobind(target: (...args: any[])=> any, ctx: ClassMethodDecoratorContext){
//    console.log('======= autobind here ========\n', target, ctx);

    ctx.addInitializer(function(this:any){
        this[ctx.name] = this[ctx.name].bind(this);
    });

}

function fieldLogger(target:undefined, ctx: ClassFieldDecoratorContext)
{
        console.log('======= fieldLogger here ========\n', target, ctx);
        return (initialValue:any) => {
            console.log( 'initial val', initialValue);
            return '';
        }

}

@logger
class Person {
    @fieldLogger
    name = 'Max'

    @autobind
    greet ()
    {
        console.log( 'hi im', this.name)
    }
}

const max = new Person();
const greet = max.greet; //if trying to run, it gets undefined this
greet()