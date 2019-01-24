const navigation = {};

navigation.dirMove= (self, destination) => {
    self.log('destx ' + destination[0] + 'dy ' + destination[1]);
    self.log('selfx ' + self.me.x + 'selfy ' + self.me.y);
    var dx = destination[0]-self.me.x;
    var dy = destination[1]-self.me.y;
    if (dx <0) {
      dx =-1;
    }else{
      dx=1;
    }
    if (dy<0){
      dy =-1
    }else{
      dy =1;
    }
    self.log('dx ' + dx + 'dy ' + dy);
  return [dx,dy];
}
navigation.basicMove= (self, destination) => {
  self.log('destx ' + destination[0] + 'dy ' + destination[1]);
  return [destination[0],destination[1]];
}
export default navigation;
