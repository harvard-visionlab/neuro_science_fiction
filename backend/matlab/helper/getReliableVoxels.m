function [voxelReliability,sortIdx,topIdx]=getReliableVoxels(D,N)

disp('getting most reliable voxels...');
rel=[];
for v=1:size(D,2)
    r=corr(squeeze(D(:,v,:)));
    voxelReliability(v)=mean(r(logical(1-eye(size(r,1)))));
end
[Y,sortIdx]=sort(voxelReliability,'descend');
topIdx=sortIdx(1:N);
voxelReliability(topIdx);
disp('done!')