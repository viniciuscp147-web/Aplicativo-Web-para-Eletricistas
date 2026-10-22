// Gera tests/java-reference.json executando a MESMA matemática do Kotlin original (transliterada) na JVM.
// Uso: java GenRef.java > java-reference.json   (JDK 11+)
import java.util.*;
public class GenRef {
  static final double[] SEC={0.5,0.75,1,1.5,2.5,4,6,10,16,25,35,50,70,95,120};
  static final double[] CUR={9,12,14.5,17.5,24,32,41,57,76,101,125,151,192,232,269};
  static final double[] KG={4.8,7.2,9.6,14.4,24,38.4,57.6,96,153.6,240,336,480,672,912,1152};
  static String f(String p,double x){return String.format(Locale.US,p,x);}
  static double r(Random R){ switch(R.nextInt(4)){case 0:return Math.round(R.nextDouble()*100000)/1000.0;case 1:return R.nextInt(2000);case 2:return R.nextDouble()*500;default:return Math.round(R.nextDouble()*1000)/10.0;} }
  public static void main(String[] a){
    Random R=new Random(42); StringBuilder o=new StringBuilder("{\"fmt\":[");
    for(int i=0;i<4000;i++){ double x=i<2000?r(R):(i<3000?R.nextInt(400000)/8.0:R.nextInt(400000)/200.0);
      o.append(i>0?",":"").append("[\"").append(x).append("\",\"").append(f("%.0f",x)).append("\",\"").append(f("%.1f",x)).append("\",\"").append(f("%.2f",x)).append("\"]"); }
    o.append("],\"vd\":[");
    for(int i=0;i<3000;i++){ double d=r(R)%300,c=r(R)%120,v=new double[]{127,220,380,440,110}[R.nextInt(5)],s=SEC[R.nextInt(15)]; if(i%50==0)d=0; boolean tri=R.nextBoolean();
      double k=tri?Math.sqrt(3.0):2.0,rho=0.0210; double res[];
      if(d<=0||c<=0){res=new double[]{0,0,v,0,s};} else { double dV=(k*rho*d*c)/s,pct=(dV/v)*100.0,fin=Math.max(v-dV,0.0),rw=(rho*d)/s,loss=(tri?3.0:2.0)*rw*c*c,minS=(k*rho*d*c)/(0.04*v),sug=SEC[14]; for(double q:SEC){if(q>=minS){sug=q;break;}} res=new double[]{dV,pct,fin,loss,sug}; }
      String st=res[1]<=4.0?"COMPLIANT":res[1]<=7.0?"WARNING":"NON_COMPLIANT";
      o.append(i>0?",":"").append("{\"in\":[").append(d).append(",").append(s).append(",").append(c).append(",").append(v).append(",").append(tri).append("],\"out\":[").append(res[0]).append(",").append(res[1]).append(",").append(res[2]).append(",").append(res[3]).append(",").append(res[4]).append(",\"").append(st).append("\",\"").append(f("%.2f",res[1])).append("\",\"").append(f("%.2f",res[0])).append("\",\"").append(f("%.1f",res[3])).append("\"]}"); }
    o.append("],\"pw\":[");
    for(int i=0;i<3000;i++){ double w=r(R)*10,v=new double[]{110,127,220,380,r(R)}[R.nextInt(5)],am=r(R)%200,pf=new double[]{1.0,0.92,0.85,0.05,1.7,r(R)%1.2}[R.nextInt(6)]; boolean tri=R.nextBoolean();
      double fac=tri?Math.sqrt(3.0):1.0,p=Math.min(Math.max(pf,0.1),1.0); double dc=v*fac*p,cu=dc>0?w/dc:0.0,po=v*am*fac*p,dv=am*fac*p,vo=dv>0?w/dv:0.0;
      String pfmt=po>=1000?f("%.2f",po/1000.0)+" kW ("+f("%.0f",po)+" W)":f("%.1f",po)+" W";
      o.append(i>0?",":"").append("{\"in\":[").append(w).append(",").append(v).append(",").append(am).append(",").append(pf).append(",").append(tri).append("],\"out\":[").append(cu).append(",\"").append(f("%.2f",cu)).append("\",").append(po).append(",\"").append(pfmt).append("\",").append(vo).append(",\"").append(f("%.1f",vo)).append("\"]}"); }
    o.append("],\"bud\":[");
    for(int i=0;i<3000;i++){ double m=new double[]{r(R)%1000,R.nextInt(1000),100,250,R.nextInt(5000)/10.0}[R.nextInt(5)],up=Math.round(R.nextDouble()*25000)/100.0,dc=new double[]{0,4,5,6,5.5}[R.nextInt(5)]; int si=R.nextInt(15);
      int rolls=(int)(m/100); double left=m%100,ru=up*100*(1.0-dc/100.0),tot=(rolls*ru)+(left*up),kg=(m/1000.0)*KG[si];
      o.append(i>0?",":"").append("{\"in\":[").append(m).append(",").append(up).append(",").append(dc).append(",").append(SEC[si]).append("],\"out\":[").append(rolls).append(",").append(left).append(",").append(tot).append(",").append(kg).append(",\"").append(f("%.2f",kg)).append("\"]}"); }
    o.append("]}"); System.out.println(o);
  }
}
